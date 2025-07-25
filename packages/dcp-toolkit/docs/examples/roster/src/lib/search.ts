export const similarityScore = (str1: string, str2: string): number => {
  const similarity =
    (2 * longestCommonSubstring(str1, str2)) / (str1.length + str2.length);
  return similarity;
};

export const longestCommonSubstring = (str1: string, str2: string): number => {
  const dp: number[][] = Array.from({ length: str1.length + 1 }, () =>
    Array.from({ length: str2.length + 1 }, () => 0)
  );
  let longest = 0;
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        longest = Math.max(longest, dp[i][j]);
      }
    }
  }
  return longest;
};
