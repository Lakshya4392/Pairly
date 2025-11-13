#!/bin/bash
# Script to identify components that need fixing

echo "Components using 'colors' in styles:"
echo "======================================"

for file in Pairly/src/components/*.tsx; do
  if grep -q "const styles = StyleSheet.create" "$file"; then
    if grep -A 50 "const styles = StyleSheet.create" "$file" | grep -q "colors\."; then
      echo "❌ NEEDS FIX: $(basename $file)"
    else
      echo "✅ OK: $(basename $file)"
    fi
  fi
done
