export interface ProblemTemplate {
  name: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topic: string;
}

export const PROBLEM_BANK: ProblemTemplate[] = [
  // Arrays
  { name: "Two Sum", slug: "two-sum", difficulty: "EASY", topic: "Arrays" },
  { name: "Contains Duplicate", slug: "contains-duplicate", difficulty: "EASY", topic: "Arrays" },
  { name: "Best Time to Buy and Sell Stock", slug: "best-time-to-buy-and-sell-stock", difficulty: "EASY", topic: "Arrays" },
  { name: "Product of Array Except Self", slug: "product-of-array-except-self", difficulty: "MEDIUM", topic: "Arrays" },
  { name: "Maximum Subarray", slug: "maximum-subarray", difficulty: "MEDIUM", topic: "Arrays" },
  { name: "3Sum", slug: "3sum", difficulty: "MEDIUM", topic: "Arrays" },

  // Strings
  { name: "Valid Palindrome", slug: "valid-palindrome", difficulty: "EASY", topic: "Strings" },
  { name: "Valid Anagram", slug: "valid-anagram", difficulty: "EASY", topic: "Strings" },
  { name: "Valid Parentheses", slug: "valid-parentheses", difficulty: "EASY", topic: "Strings" },
  { name: "Longest Palindromic Substring", slug: "longest-palindromic-substring", difficulty: "MEDIUM", topic: "Strings" },
  { name: "Group Anagrams", slug: "group-anagrams", difficulty: "MEDIUM", topic: "Strings" },

  // Binary Search
  { name: "Binary Search", slug: "binary-search", difficulty: "EASY", topic: "Binary Search" },
  { name: "Search in Rotated Sorted Array", slug: "search-in-rotated-sorted-array", difficulty: "MEDIUM", topic: "Binary Search" },
  { name: "Find Minimum in Rotated Sorted Array", slug: "find-min-in-rotated-sorted-array", difficulty: "MEDIUM", topic: "Binary Search" },
  { name: "Median of Two Sorted Arrays", slug: "median-of-two-sorted-arrays", difficulty: "HARD", topic: "Binary Search" },

  // Linked List
  { name: "Reverse Linked List", slug: "reverse-linked-list", difficulty: "EASY", topic: "Linked List" },
  { name: "Merge Two Sorted Lists", slug: "merge-two-sorted-lists", difficulty: "EASY", topic: "Linked List" },
  { name: "Linked List Cycle", slug: "linked-list-cycle", difficulty: "EASY", topic: "Linked List" },
  { name: "Remove Nth Node From End of List", slug: "remove-nth-node-from-end-of-list", difficulty: "MEDIUM", topic: "Linked List" },

  // Trees
  { name: "Invert Binary Tree", slug: "invert-binary-tree", difficulty: "EASY", topic: "Trees" },
  { name: "Maximum Depth of Binary Tree", slug: "maximum-depth-of-binary-tree", difficulty: "EASY", topic: "Trees" },
  { name: "Same Tree", slug: "same-tree", difficulty: "EASY", topic: "Trees" },
  { name: "Binary Tree Level Order Traversal", slug: "binary-tree-level-order-traversal", difficulty: "MEDIUM", topic: "Trees" },
  { name: "Validate Binary Search Tree", slug: "validate-binary-search-tree", difficulty: "MEDIUM", topic: "Trees" },

  // Graphs
  { name: "Number of Islands", slug: "number-of-islands", difficulty: "MEDIUM", topic: "Graph" },
  { name: "Clone Graph", slug: "clone-graph", difficulty: "MEDIUM", topic: "Graph" },
  { name: "Course Schedule", slug: "course-schedule", difficulty: "MEDIUM", topic: "Graph" },
  { name: "Network Delay Time", slug: "network-delay-time", difficulty: "MEDIUM", topic: "Graph" },

  // Dynamic Programming
  { name: "Climbing Stairs", slug: "climbing-stairs", difficulty: "EASY", topic: "DP" },
  { name: "Coin Change", slug: "coin-change", difficulty: "MEDIUM", topic: "DP" },
  { name: "Longest Increasing Subsequence", slug: "longest-increasing-subsequence", difficulty: "MEDIUM", topic: "DP" },
  { name: "House Robber", slug: "house-robber", difficulty: "MEDIUM", topic: "DP" },
  { name: "Edit Distance", slug: "edit-distance", difficulty: "HARD", topic: "DP" },
  { name: "Unique Paths", slug: "unique-paths", difficulty: "MEDIUM", topic: "DP" },
];
