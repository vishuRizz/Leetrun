const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface LeetcodeCookieAuth {
  cookieHeader: string;
  csrfToken: string;
}

export interface LeetcodeSolvedQuestion {
  title: string;
  titleSlug: string;
  difficulty: string;
  acRate: number | null;
  topicSlugs: string[];
}

async function fetchLeetCode(query: string, variables: Record<string, any>) {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": USER_AGENT,
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

async function fetchLeetCodeWithAuth(
  query: string,
  variables: Record<string, unknown>,
  auth: LeetcodeCookieAuth
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Referer: "https://leetcode.com",
    Origin: "https://leetcode.com",
    Cookie: auth.cookieHeader,
    "User-Agent": USER_AGENT,
  };
  if (auth.csrfToken) {
    headers["x-csrftoken"] = auth.csrfToken;
  }

  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`LeetCode HTTP ${response.status}. Check your session cookie.`);
  }

  const data = await response.json();
  if (data.errors?.length) {
    throw new Error(
      data.errors[0]?.message || "LeetCode rejected the authenticated request."
    );
  }
  return data.data;
}

const SOLVED_LIST_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        title
        titleSlug
        difficulty
        status
        acRate
        topicTags {
          name
          slug
        }
      }
    }
  }
`;

/** Fetch every AC problem for the logged-in user via session cookie. */
export async function fetchAllSolvedProblems(
  auth: LeetcodeCookieAuth
): Promise<LeetcodeSolvedQuestion[]> {
  const limit = 100;
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;
  const all: LeetcodeSolvedQuestion[] = [];

  while (skip < total) {
    const data = await fetchLeetCodeWithAuth(
      SOLVED_LIST_QUERY,
      {
        categorySlug: "",
        skip,
        limit,
        filters: { status: "AC" },
      },
      auth
    );

    const list = data?.problemsetQuestionList;
    if (!list) {
      throw new Error(
        "Could not read solved problems. Your session cookie may be expired."
      );
    }

    total = list.total ?? 0;
    const questions: any[] = list.questions ?? [];
    if (questions.length === 0) break;

    for (const q of questions) {
      all.push({
        title: q.title,
        titleSlug: q.titleSlug,
        difficulty: q.difficulty || "Easy",
        acRate: typeof q.acRate === "number" ? q.acRate : null,
        topicSlugs: (q.topicTags || []).map((t: any) => t.slug).filter(Boolean),
      });
    }

    skip += questions.length;
    if (questions.length < limit) break;
  }

  return all;
}

/** Quick sanity check that a session cookie is valid. */
export async function validateLeetcodeSession(
  auth: LeetcodeCookieAuth
): Promise<boolean> {
  try {
    const data = await fetchLeetCodeWithAuth(
      SOLVED_LIST_QUERY,
      {
        categorySlug: "",
        skip: 0,
        limit: 1,
        filters: { status: "AC" },
      },
      auth
    );
    return Boolean(data?.problemsetQuestionList);
  } catch {
    return false;
  }
}
