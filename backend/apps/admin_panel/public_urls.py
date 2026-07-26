"""
Public read-only config routes, mounted under /api/config/.

Lives in admin_panel because this app owns SystemConfig, but these endpoints are
deliberately unauthenticated — the disclaimer is a legal notice the app must be
able to show on any screen, including before sign-in.
"""

from django.urls import path

from .views import PublicDisclaimerView

urlpatterns = [
    path("disclaimer/", PublicDisclaimerView.as_view(), name="public-disclaimer"),
]
