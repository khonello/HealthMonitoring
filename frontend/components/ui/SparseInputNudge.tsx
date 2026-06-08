import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';

export function SparseInputNudge() {
  return (
    <View style={styles.container}>
      <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
      <Text style={styles.text}>
        Add more vitals or describe your symptoms for a more accurate analysis.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.primaryText,
    lineHeight: 18,
  },
});
