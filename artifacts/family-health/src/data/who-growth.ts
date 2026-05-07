// WHO Child Growth Standards - Weight-for-age (kg) and Height-for-age (cm)
// Data points: [ageYears, P3, P50, P97]
export type GrowthPoint = { age: number; p3: number; p50: number; p97: number };

export const boyWeight: GrowthPoint[] = [
  { age: 0, p3: 2.5, p50: 3.3, p97: 4.3 },
  { age: 0.25, p3: 4.4, p50: 5.6, p97: 6.9 },
  { age: 0.5, p3: 6.0, p50: 7.4, p97: 9.0 },
  { age: 0.75, p3: 7.0, p50: 8.5, p97: 10.3 },
  { age: 1, p3: 7.8, p50: 9.6, p97: 11.8 },
  { age: 1.5, p3: 9.0, p50: 11.1, p97: 13.6 },
  { age: 2, p3: 10.0, p50: 12.2, p97: 15.3 },
  { age: 3, p3: 11.6, p50: 14.3, p97: 18.1 },
  { age: 4, p3: 13.1, p50: 16.3, p97: 20.9 },
  { age: 5, p3: 14.2, p50: 18.3, p97: 23.9 },
  { age: 6, p3: 15.9, p50: 20.5, p97: 27.4 },
  { age: 7, p3: 17.7, p50: 22.9, p97: 31.7 },
  { age: 8, p3: 19.5, p50: 25.6, p97: 37.0 },
  { age: 9, p3: 21.3, p50: 28.6, p97: 42.9 },
  { age: 10, p3: 23.3, p50: 31.9, p97: 49.7 },
  { age: 11, p3: 25.6, p50: 35.8, p97: 57.4 },
  { age: 12, p3: 28.2, p50: 40.5, p97: 65.3 },
  { age: 13, p3: 31.3, p50: 45.6, p97: 72.7 },
  { age: 14, p3: 35.0, p50: 51.0, p97: 79.3 },
  { age: 15, p3: 38.7, p50: 56.3, p97: 84.8 },
  { age: 16, p3: 42.3, p50: 61.0, p97: 88.9 },
  { age: 18, p3: 48.2, p50: 68.2, p97: 95.0 },
  { age: 20, p3: 52.0, p50: 72.5, p97: 98.8 },
];

export const girlWeight: GrowthPoint[] = [
  { age: 0, p3: 2.4, p50: 3.2, p97: 4.2 },
  { age: 0.25, p3: 3.9, p50: 5.1, p97: 6.6 },
  { age: 0.5, p3: 5.7, p50: 7.3, p97: 9.3 },
  { age: 0.75, p3: 6.5, p50: 8.2, p97: 10.5 },
  { age: 1, p3: 7.0, p50: 8.9, p97: 11.5 },
  { age: 1.5, p3: 8.1, p50: 10.2, p97: 13.3 },
  { age: 2, p3: 9.0, p50: 11.5, p97: 14.9 },
  { age: 3, p3: 10.8, p50: 13.9, p97: 18.4 },
  { age: 4, p3: 12.3, p50: 16.1, p97: 22.2 },
  { age: 5, p3: 13.7, p50: 18.2, p97: 26.0 },
  { age: 6, p3: 15.3, p50: 20.2, p97: 30.1 },
  { age: 7, p3: 17.0, p50: 22.4, p97: 35.0 },
  { age: 8, p3: 19.0, p50: 25.0, p97: 40.6 },
  { age: 9, p3: 21.3, p50: 28.1, p97: 47.2 },
  { age: 10, p3: 23.8, p50: 31.9, p97: 54.5 },
  { age: 11, p3: 26.8, p50: 36.2, p97: 62.0 },
  { age: 12, p3: 30.5, p50: 41.0, p97: 68.8 },
  { age: 13, p3: 34.4, p50: 46.0, p97: 74.0 },
  { age: 14, p3: 38.4, p50: 50.6, p97: 78.0 },
  { age: 15, p3: 41.4, p50: 54.2, p97: 80.8 },
  { age: 16, p3: 43.7, p50: 56.8, p97: 82.8 },
  { age: 18, p3: 46.3, p50: 59.9, p97: 85.2 },
  { age: 20, p3: 47.5, p50: 61.3, p97: 86.5 },
];

export const boyHeight: GrowthPoint[] = [
  { age: 0, p3: 45.5, p50: 49.9, p97: 54.7 },
  { age: 0.25, p3: 57.4, p50: 61.4, p97: 65.5 },
  { age: 0.5, p3: 63.3, p50: 67.6, p97: 72.0 },
  { age: 0.75, p3: 67.7, p50: 72.1, p97: 76.5 },
  { age: 1, p3: 71.0, p50: 75.7, p97: 80.5 },
  { age: 1.5, p3: 77.5, p50: 82.4, p97: 88.0 },
  { age: 2, p3: 82.5, p50: 87.8, p97: 94.2 },
  { age: 3, p3: 89.5, p50: 96.1, p97: 102.9 },
  { age: 4, p3: 95.8, p50: 103.3, p97: 111.4 },
  { age: 5, p3: 102.0, p50: 110.0, p97: 118.9 },
  { age: 6, p3: 107.4, p50: 116.0, p97: 125.4 },
  { age: 7, p3: 113.1, p50: 121.7, p97: 131.3 },
  { age: 8, p3: 118.4, p50: 127.3, p97: 137.0 },
  { age: 9, p3: 123.5, p50: 132.6, p97: 142.5 },
  { age: 10, p3: 128.4, p50: 137.8, p97: 148.1 },
  { age: 11, p3: 133.2, p50: 143.1, p97: 154.3 },
  { age: 12, p3: 138.0, p50: 149.1, p97: 161.8 },
  { age: 13, p3: 144.0, p50: 156.2, p97: 170.0 },
  { age: 14, p3: 150.7, p50: 163.2, p97: 176.2 },
  { age: 15, p3: 156.8, p50: 169.0, p97: 181.5 },
  { age: 16, p3: 161.7, p50: 173.8, p97: 185.7 },
  { age: 18, p3: 166.5, p50: 178.5, p97: 190.0 },
  { age: 20, p3: 168.0, p50: 180.0, p97: 191.5 },
];

export const girlHeight: GrowthPoint[] = [
  { age: 0, p3: 45.4, p50: 49.1, p97: 53.2 },
  { age: 0.25, p3: 56.2, p50: 59.9, p97: 63.9 },
  { age: 0.5, p3: 61.2, p50: 65.7, p97: 70.4 },
  { age: 0.75, p3: 65.6, p50: 70.1, p97: 74.8 },
  { age: 1, p3: 68.9, p50: 74.0, p97: 79.2 },
  { age: 1.5, p3: 75.0, p50: 80.7, p97: 87.0 },
  { age: 2, p3: 80.0, p50: 86.4, p97: 93.3 },
  { age: 3, p3: 88.3, p50: 95.1, p97: 102.5 },
  { age: 4, p3: 94.9, p50: 102.7, p97: 111.3 },
  { age: 5, p3: 101.0, p50: 109.4, p97: 118.7 },
  { age: 6, p3: 106.7, p50: 115.5, p97: 125.3 },
  { age: 7, p3: 112.2, p50: 121.3, p97: 131.4 },
  { age: 8, p3: 117.4, p50: 127.0, p97: 137.7 },
  { age: 9, p3: 122.6, p50: 132.8, p97: 144.2 },
  { age: 10, p3: 127.9, p50: 138.6, p97: 150.8 },
  { age: 11, p3: 133.7, p50: 145.0, p97: 157.8 },
  { age: 12, p3: 140.1, p50: 151.5, p97: 163.7 },
  { age: 13, p3: 145.6, p50: 157.2, p97: 168.5 },
  { age: 14, p3: 149.7, p50: 161.2, p97: 172.4 },
  { age: 15, p3: 152.2, p50: 163.7, p97: 174.9 },
  { age: 16, p3: 153.5, p50: 165.0, p97: 176.2 },
  { age: 18, p3: 154.8, p50: 166.3, p97: 177.5 },
  { age: 20, p3: 155.3, p50: 167.0, p97: 178.2 },
];

export function interpolateWHO(data: GrowthPoint[], ageYears: number): GrowthPoint {
  if (ageYears <= data[0].age) return { ...data[0], age: ageYears };
  if (ageYears >= data[data.length - 1].age) return { ...data[data.length - 1], age: ageYears };
  const hi = data.findIndex(d => d.age >= ageYears);
  const lo = hi - 1;
  const t = (ageYears - data[lo].age) / (data[hi].age - data[lo].age);
  return {
    age: ageYears,
    p3: +(data[lo].p3 + t * (data[hi].p3 - data[lo].p3)).toFixed(2),
    p50: +(data[lo].p50 + t * (data[hi].p50 - data[lo].p50)).toFixed(2),
    p97: +(data[lo].p97 + t * (data[hi].p97 - data[lo].p97)).toFixed(2),
  };
}

export function getWHOCurve(
  gender: 'male' | 'female',
  ageMin: number,
  ageMax: number,
  type: 'weight' | 'height'
) {
  const table = type === 'weight'
    ? (gender === 'male' ? boyWeight : girlWeight)
    : (gender === 'male' ? boyHeight : girlHeight);
  const span = Math.max(ageMax - ageMin, 0.5);
  const step = span <= 1 ? 0.083 : span <= 3 ? 0.25 : span <= 8 ? 0.5 : 1;
  const pts: { age: number; p3: number; p50: number; p97: number }[] = [];
  for (let age = ageMin; age <= ageMax + step * 0.5; age = +(age + step).toFixed(4)) {
    const r = interpolateWHO(table, Math.min(age, 20));
    pts.push({ age: +age.toFixed(3), p3: r.p3, p50: r.p50, p97: r.p97 });
  }
  return pts;
}
