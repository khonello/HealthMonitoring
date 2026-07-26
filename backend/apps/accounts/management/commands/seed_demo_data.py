"""
Seeds deterministic demo accounts, health history, triage results and reports.

Every seeded account lives on the @health.test domain so the whole fixture set can
be identified and removed without ever touching real user data. No LLM calls are
made — triage results are written directly so the data is reproducible offline.

    python manage.py seed_demo_data
    python manage.py seed_demo_data --fresh          # delete and re-seed
    python manage.py seed_demo_data --password Foo123456
"""

import random
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.admin_panel.models import LLMFailureLog
from apps.feedback.models import Feedback
from apps.health_records.models import HealthRecord
from apps.reports.assembler import build_readings_summary, get_disclaimer
from apps.reports.models import HealthReport, TriageResult

SEED_DOMAIN = "@health.test"
DEFAULT_PASSWORD = "HealthTest123"
SEED_MODEL = "llama-3.3-70b-versatile"
SEED_PROMPT = "[seeded fixture — no LLM call was made for this record]"

# Deterministic jitter for submission minutes, so repeated seeds are identical.
_rng = random.Random(1337)

_DEFAULT_RECOMMENDATIONS = {
    "see_doctor": (
        "Your readings fall outside the safe range for self-care. Book an appointment "
        "with a clinician within the next 24 hours and bring this report with you. "
        "If your symptoms get worse before then, go to the nearest hospital."
    ),
    "visit_pharmacy": (
        "Your symptoms look manageable with over-the-counter care. Speak to a pharmacist "
        "about your symptoms, rest, and keep your fluid intake up. Check in again if "
        "things have not improved in two days."
    ),
    "rest_at_home": (
        "Your readings are within normal ranges. Rest, stay hydrated, and keep logging "
        "your vitals so any change is caught early. No further action is needed today."
    ),
}


def _rec(
    days_ago,
    hour,
    *,
    level,
    urgency,
    temp=None,
    hr=None,
    spo2=None,
    sys=None,
    dia=None,
    symptoms=None,
    confidence="high",
    hard_rule=None,
    follow_up_hours=None,
    recommendation=None,
):
    return {
        "days_ago": days_ago,
        "hour": hour,
        "temperature": temp,
        "heart_rate": hr,
        "spo2": spo2,
        "systolic_bp": sys,
        "diastolic_bp": dia,
        "symptom_description": symptoms,
        "triage_level": level,
        "urgency": urgency,
        "confidence_level": confidence,
        "hard_rule_metric": hard_rule,
        "follow_up_hours": follow_up_hours,
        "recommendation_text": recommendation,
    }


PERSONAS = [
    {
        "email": f"admin{SEED_DOMAIN}",
        "full_name": "Ama Mensah",
        "date_of_birth": date(1988, 3, 14),
        "gender": "female",
        "is_staff": True,
        "is_superuser": True,
        "joined_days_ago": 240,
        "note": "Superuser - admin panel + Django admin",
        "records": [
            _rec(9, 7, temp=36.7, hr=70, spo2=98, sys=117, dia=75, level="rest_at_home", urgency="low"),
            _rec(
                2, 20, temp=37.3, hr=82, spo2=97, sys=124, dia=80,
                symptoms="Long day at work, mild tension headache behind the eyes since the afternoon.",
                level="rest_at_home", urgency="low",
            ),
        ],
    },
    {
        "email": f"staff{SEED_DOMAIN}",
        "full_name": "Kwesi Boateng",
        "date_of_birth": date(1992, 11, 2),
        "gender": "male",
        "is_staff": True,
        "is_superuser": False,
        "joined_days_ago": 95,
        "note": "Staff only, NOT superuser - tests staff/superuser split",
        "records": [
            _rec(14, 8, temp=36.9, hr=74, spo2=98, sys=120, dia=78, level="rest_at_home", urgency="low"),
            _rec(
                6, 19, temp=37.6, hr=90, spo2=96, sys=129, dia=83,
                symptoms="Scratchy throat and a blocked nose that started after a cold night on call.",
                level="visit_pharmacy", urgency="medium", follow_up_hours=48,
            ),
            _rec(3, 9, temp=37.0, hr=76, spo2=98, sys=121, dia=79, level="rest_at_home", urgency="low"),
        ],
    },
    {
        "email": f"user{SEED_DOMAIN}",
        "full_name": "Akosua Danso",
        "date_of_birth": date(1996, 6, 21),
        "gender": "female",
        "is_staff": False,
        "is_superuser": False,
        "joined_days_ago": 50,
        "note": "Main test account - 13 records, all triage levels, 45 days of history",
        "records": [
            _rec(
                44, 7, temp=36.8, hr=72, spo2=98, sys=118, dia=76,
                symptoms="Feeling generally well today, no complaints at all, just logging my usual morning check.",
                level="rest_at_home", urgency="low",
            ),
            _rec(40, 8, temp=37.0, hr=78, spo2=97, sys=121, dia=79, level="rest_at_home", urgency="low", confidence="medium"),
            _rec(
                36, 18, temp=37.8, hr=92, spo2=96, sys=128, dia=84,
                symptoms="Sore throat since yesterday evening with a mild headache and some difficulty swallowing food.",
                level="visit_pharmacy", urgency="medium",
            ),
            _rec(
                35, 21, temp=38.2, hr=98, spo2=95, sys=130, dia=86,
                symptoms="Throat still sore, now with a dry cough and body aches that kept me awake most of the night.",
                level="visit_pharmacy", urgency="medium", follow_up_hours=24,
            ),
            _rec(
                33, 9, temp=37.2, hr=84, spo2=97, sys=124, dia=80,
                symptoms="Cough easing off after starting the pharmacy medication, throat feels much better now.",
                level="rest_at_home", urgency="low",
            ),
            _rec(28, 7, temp=36.9, hr=70, spo2=98, sys=119, dia=78, level="rest_at_home", urgency="low", confidence="medium"),
            _rec(
                21, 17,
                symptoms="Mild lower back pain after lifting boxes at work all morning, no fever or other symptoms.",
                level="visit_pharmacy", urgency="low", confidence="low",
            ),
            _rec(17, 8, temp=36.7, hr=68, spo2=99, sys=116, dia=74, level="rest_at_home", urgency="low", confidence="medium"),
            _rec(
                12, 6, temp=38.6, hr=104, spo2=94, sys=138, dia=88,
                symptoms="High fever with chills, a bad headache, and fatigue that started early this morning very suddenly.",
                level="see_doctor", urgency="high", follow_up_hours=12,
            ),
            _rec(
                11, 15, temp=38.0, hr=96, spo2=95, sys=133, dia=85,
                symptoms="Fever coming down after the clinic visit, still tired but I am eating normally again.",
                level="visit_pharmacy", urgency="medium", follow_up_hours=24,
            ),
            _rec(
                9, 10, temp=37.1, hr=80, spo2=97, sys=122, dia=79,
                symptoms="Almost back to normal, my energy is returning and I have had no fever for two days.",
                level="rest_at_home", urgency="low",
            ),
            _rec(4, 8, temp=36.8, hr=74, spo2=98, sys=120, dia=78, level="rest_at_home", urgency="low", confidence="medium"),
            _rec(
                1, 16, temp=37.4, hr=88, spo2=97, sys=126, dia=82,
                symptoms="Slight headache and feeling a little warm this afternoon, but otherwise I am doing fine.",
                level="rest_at_home", urgency="low",
            ),
        ],
    },
    {
        "email": f"critical{SEED_DOMAIN}",
        "full_name": "Yaw Owusu",
        "date_of_birth": date(1974, 1, 30),
        "gender": "male",
        "is_staff": False,
        "is_superuser": False,
        "joined_days_ago": 20,
        "note": "Latest record trips the temperature hard rule - critical UI + follow-up banner",
        "records": [
            _rec(
                6, 19, temp=37.9, hr=96, spo2=95, sys=134, dia=88,
                symptoms="Persistent cough for about a week now with some tightness in my chest when breathing.",
                level="visit_pharmacy", urgency="medium",
            ),
            _rec(
                3, 22, temp=38.4, hr=108, spo2=93, sys=142, dia=90,
                symptoms="Cough is worse, breathing feels harder especially at night, and the chest tightness has not improved.",
                level="see_doctor", urgency="high", follow_up_hours=24,
            ),
            _rec(
                0, 8, temp=41.2, hr=128, spo2=88.0, sys=168, dia=104,
                symptoms="Very high fever, struggling to breathe, dizzy when I stand up, and the chest pain keeps getting worse.",
                level="see_doctor", urgency="high", hard_rule="temperature", follow_up_hours=6,
                recommendation=(
                    "Your temperature is above the safe threshold and your oxygen saturation is low. "
                    "Go to the nearest hospital or emergency department now — do not wait for an "
                    "appointment. Take this report with you."
                ),
            ),
        ],
    },
    {
        "email": f"newuser{SEED_DOMAIN}",
        "full_name": "Efua Nyarko",
        "date_of_birth": date(2001, 9, 8),
        "gender": "female",
        "is_staff": False,
        "is_superuser": False,
        "joined_days_ago": 0,
        "note": "Zero records - tests empty states on dashboard and history",
        "records": [],
    },
    {
        "email": f"minimal{SEED_DOMAIN}",
        "full_name": "Kojo Asare",
        "date_of_birth": None,
        "gender": "",
        "is_staff": False,
        "is_superuser": False,
        "joined_days_ago": 7,
        "note": "No DOB or gender - tests 'Not set' profile rows and low-confidence triage",
        "records": [
            _rec(
                5, 12,
                symptoms="Stomach has been upset since lunch, nothing severe.",
                level="visit_pharmacy", urgency="low", confidence="low",
            ),
        ],
    },
]

# Seeded so the feedback screens (user history + admin queue) have something to render.
# attach_record links the feedback to that user's most recent check-in.
FEEDBACK = [
    {
        "email": f"user{SEED_DOMAIN}",
        "category": "triage_accuracy",
        "message": (
            "I got a 'rest at home' result but my temperature climbed to 38.5 later that "
            "evening. Maybe the assessment should say how quickly to re-check."
        ),
        "rating": 4,
        "status": "new",
        "admin_note": "",
        "attach_record": True,
        "days_ago": 3,
    },
    {
        "email": f"user{SEED_DOMAIN}",
        "category": "suggestion",
        "message": (
            "It would help a lot if I could note the medication I am already taking before "
            "the triage runs, so the recommendation accounts for it."
        ),
        "rating": 5,
        "status": "reviewed",
        "admin_note": "Worth doing — overlaps with the symptom NLP preprocessing work.",
        "attach_record": False,
        "days_ago": 12,
    },
    {
        "email": f"critical{SEED_DOMAIN}",
        "category": "bug",
        "message": (
            "The report screen froze after I submitted my vitals last night. I had to force "
            "close the app and reopen it before I could see the result."
        ),
        "rating": 2,
        "status": "new",
        "admin_note": "",
        "attach_record": True,
        "days_ago": 1,
    },
    {
        "email": f"minimal{SEED_DOMAIN}",
        "category": "usability",
        "message": (
            "I could not work out how to set my date of birth after signing up. It took me a "
            "while to find the edit profile screen."
        ),
        "rating": 3,
        "status": "resolved",
        "admin_note": "Addressed — Edit Profile is now a button on the profile header.",
        "attach_record": False,
        "days_ago": 4,
    },
    {
        "email": f"newuser{SEED_DOMAIN}",
        "category": "other",
        "message": (
            "Just signed up and the onboarding was clear about this not being a diagnosis. "
            "Good to know up front."
        ),
        "rating": 5,
        "status": "new",
        "admin_note": "",
        "attach_record": False,
        "days_ago": 0,
    },
]

# Seeded so the admin LLM-health screen has something to render.
FAILURE_LOGS = [
    ("triage", "RateLimitError", "Groq API returned 429: rate limit exceeded for llama-3.3-70b-versatile.", 5),
    ("triage", "JSONDecodeError", "Model response was not valid JSON after markdown stripping.", 2),
    ("retry", "APITimeoutError", "Request to Groq timed out after 30s.", 1),
]


def _resolve_input_mode(spec) -> str:
    has_readings = any(
        spec[k] is not None
        for k in ("temperature", "heart_rate", "spo2", "systolic_bp", "diastolic_bp")
    )
    has_description = bool((spec["symptom_description"] or "").strip())
    if has_readings and has_description:
        return "mixed"
    if has_description:
        return "descriptive"
    return "structured"


def _timestamp_for(spec):
    now = timezone.now()
    when = (now - timedelta(days=spec["days_ago"])).replace(
        hour=spec["hour"], minute=_rng.randint(0, 59), second=0, microsecond=0
    )
    if when < now:
        return when
    # The hour hasn't arrived yet today. Pull the record back, but never past
    # midnight — a days_ago=0 record must still read as "today" on the dashboard,
    # even when the seed is run in the small hours.
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return max(midnight + timedelta(minutes=1), now - timedelta(hours=2))


class Command(BaseCommand):
    help = "Seeds demo users, health records, triage results and reports for testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help=f"Delete existing {SEED_DOMAIN} accounts (and their data) before seeding.",
        )
        parser.add_argument(
            "--password",
            default=DEFAULT_PASSWORD,
            help=f"Password applied to every seeded account (default: {DEFAULT_PASSWORD}).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow the command to run when DEBUG is False.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "Refusing to seed demo data with DEBUG=False. Re-run with --force if this "
                "really is a throwaway environment."
            )

        password = options["password"]
        if len(password) < 8:
            raise CommandError("Password must be at least 8 characters to match the register flow.")

        existing = User.objects.filter(email__endswith=SEED_DOMAIN)
        if options["fresh"]:
            count = existing.count()
            existing.delete()
            LLMFailureLog.objects.filter(health_record__isnull=True).delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} existing seed account(s)."))
        elif existing.exists():
            raise CommandError(
                f"{existing.count()} seed account(s) already exist. Re-run with --fresh to replace them."
            )

        disclaimer = get_disclaimer()
        total_records = 0
        users_by_email = {}

        for persona in PERSONAS:
            user = User.objects.create_user(
                email=persona["email"],
                password=password,
                full_name=persona["full_name"],
                date_of_birth=persona["date_of_birth"],
                gender=persona["gender"],
                is_staff=persona["is_staff"],
                is_superuser=persona["is_superuser"],
            )
            joined = timezone.now() - timedelta(days=persona["joined_days_ago"])
            User.objects.filter(pk=user.pk).update(created_at=joined)
            users_by_email[persona["email"]] = user

            for spec in persona["records"]:
                self._create_record(user, spec, disclaimer)
                total_records += 1

            role = "superuser" if persona["is_superuser"] else "staff" if persona["is_staff"] else "user"
            self.stdout.write(
                f"  {persona['email']:<26} {role:<10} {len(persona['records']):>2} record(s)  - {persona['note']}"
            )

        for spec in FEEDBACK:
            user = users_by_email[spec["email"]]
            record = (
                user.health_records.order_by("-submitted_at").first()
                if spec["attach_record"]
                else None
            )
            entry = Feedback.objects.create(
                user=user,
                health_record=record,
                category=spec["category"],
                message=spec["message"],
                rating=spec["rating"],
                status=spec["status"],
                admin_note=spec["admin_note"],
                app_version="1.0.0",
                platform="ios",
            )
            Feedback.objects.filter(pk=entry.pk).update(
                created_at=timezone.now() - timedelta(days=spec["days_ago"], hours=2)
            )

        for source, error_type, message, days_ago in FAILURE_LOGS:
            log = LLMFailureLog.objects.create(
                source=source, error_type=error_type, error_message=message
            )
            LLMFailureLog.objects.filter(pk=log.pk).update(
                occurred_at=timezone.now() - timedelta(days=days_ago)
            )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(PERSONAS)} accounts, {total_records} health records, "
                f"{len(FEEDBACK)} feedback entries, {len(FAILURE_LOGS)} LLM failure logs."
            )
        )
        self.stdout.write(f"Password for every account: {password}")

    def _create_record(self, user, spec, disclaimer):
        record = HealthRecord.objects.create(
            user=user,
            input_mode=_resolve_input_mode(spec),
            temperature=spec["temperature"],
            heart_rate=spec["heart_rate"],
            spo2=spec["spo2"],
            systolic_bp=spec["systolic_bp"],
            diastolic_bp=spec["diastolic_bp"],
            symptom_description=spec["symptom_description"],
        )

        triage = TriageResult.objects.create(
            health_record=record,
            triage_level=spec["triage_level"],
            urgency=spec["urgency"],
            confidence_level=spec["confidence_level"],
            hard_rule_triggered=spec["hard_rule_metric"] is not None,
            hard_rule_metric=spec["hard_rule_metric"],
            recommendation_text=spec["recommendation_text"]
            or _DEFAULT_RECOMMENDATIONS[spec["triage_level"]],
            follow_up_flag=spec["follow_up_hours"] is not None,
            follow_up_hours=spec["follow_up_hours"],
            llm_model_used=SEED_MODEL,
            prompt_sent=SEED_PROMPT,
        )

        report = HealthReport.objects.create(
            health_record=record,
            triage_result=triage,
            readings_summary=build_readings_summary(record),
            disclaimer_text=disclaimer,
        )

        when = _timestamp_for(spec)
        HealthRecord.objects.filter(pk=record.pk).update(submitted_at=when)
        TriageResult.objects.filter(pk=triage.pk).update(generated_at=when)
        HealthReport.objects.filter(pk=report.pk).update(generated_at=when)
