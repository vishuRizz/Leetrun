const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

async function fetchLeetCode(query: string, variables: Record<string, any>) {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 0 }, // Bypasses Next.js fetch caching
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(data.errors[0]?.message || "GraphQL query error");
    }

    return data.data;
  } catch (error: any) {
    console.error("LeetCode fetch error:", error);
    throw error;
  }
}

export async function fetchLeetcodeStats(username: string) {
  const query = `
    query userSessionProgress($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        profile {
          ranking
          reputation
        }
        userCalendar {
          submissionCalendar
        }
        languageProblemCount {
          languageName
          problemsSolved
        }
      }
    }
  `;
  return fetchLeetCode(query, { username });
}

export async function fetchRecentSubmissions(username: string, limit: number = 20) {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;
  return fetchLeetCode(query, { username, limit });
}

export async function fetchContestRanking(username: string) {
  const query = `
    query userContestRankingInfo($username: String!) {
      userContestRanking(username: $username) {
        rating
        globalRanking
      }
    }
  `;
  return fetchLeetCode(query, { username });
}
