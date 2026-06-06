export type FlashcardCategory =
  | "Complexity"
  | "Pattern Triggers"
  | "Data Structures"
  | "Pitfalls";

export interface Flashcard {
  id: string;
  category: FlashcardCategory;
  front: string;
  back: string;
}

export const FLASHCARD_CATEGORIES: FlashcardCategory[] = [
  "Pattern Triggers",
  "Complexity",
  "Data Structures",
  "Pitfalls",
];

/**
 * A curated interview-prep deck. Kept intentionally high-signal: the cues an
 * interviewer expects you to recall instantly (pattern triggers, complexities,
 * DS trade-offs, classic gotchas).
 */
export const FLASHCARDS: Flashcard[] = [
  // ---- Pattern triggers ----
  {
    id: "pt-sorted",
    category: "Pattern Triggers",
    front: "You see a sorted array and need a pair / target.",
    back: "Two Pointers (or Binary Search). Sorted + 'find pair summing to X' → two pointers from both ends, O(n).",
  },
  {
    id: "pt-contiguous",
    category: "Pattern Triggers",
    front: "Contiguous subarray / substring with a constraint.",
    back: "Sliding Window. Grow the right edge, shrink the left when the window breaks the constraint. O(n).",
  },
  {
    id: "pt-kth",
    category: "Pattern Triggers",
    front: "Find the K largest / smallest / most frequent.",
    back: "Heap (priority queue) of size K → O(n log k). Or Quickselect for O(n) average.",
  },
  {
    id: "pt-topo",
    category: "Pattern Triggers",
    front: "Tasks with dependencies / ordering / prerequisites.",
    back: "Topological Sort (Kahn's BFS or DFS). Detect cycles = impossible ordering.",
  },
  {
    id: "pt-tree-levels",
    category: "Pattern Triggers",
    front: "Process a tree/graph level by level.",
    back: "BFS with a queue. Snapshot queue size at the start of each level.",
  },
  {
    id: "pt-all-paths",
    category: "Pattern Triggers",
    front: "Generate all combinations / permutations / subsets.",
    back: "Backtracking (DFS + undo choice). Time is exponential - prune aggressively.",
  },
  {
    id: "pt-overlap",
    category: "Pattern Triggers",
    front: "Overlapping subproblems + optimal substructure.",
    back: "Dynamic Programming. Define the state, recurrence, base case; memoize or tabulate.",
  },
  {
    id: "pt-intervals",
    category: "Pattern Triggers",
    front: "Merge / schedule / count overlapping intervals.",
    back: "Sort by start (or end), then sweep. Merge when current.start ≤ prev.end.",
  },
  {
    id: "pt-prefix",
    category: "Pattern Triggers",
    front: "Range sums / count subarrays equal to K.",
    back: "Prefix Sum + HashMap of seen prefix counts. O(n).",
  },
  {
    id: "pt-cycle",
    category: "Pattern Triggers",
    front: "Detect a cycle in a linked list / find the middle.",
    back: "Fast & Slow pointers (Floyd's). Fast moves 2x; they meet inside a cycle.",
  },
  {
    id: "pt-monotonic",
    category: "Pattern Triggers",
    front: "Next greater / smaller element, or histogram problems.",
    back: "Monotonic Stack. Maintain increasing/decreasing stack; pop while condition holds. O(n).",
  },
  {
    id: "pt-trie",
    category: "Pattern Triggers",
    front: "Prefix search / autocomplete / word dictionary.",
    back: "Trie (prefix tree). Insert/search in O(L) where L = word length.",
  },
  {
    id: "pt-union",
    category: "Pattern Triggers",
    front: "Connectivity / grouping / 'number of islands or components'.",
    back: "Union-Find (DSU) with path compression + union by rank, or DFS/BFS flood fill.",
  },

  // ---- Complexity ----
  {
    id: "cx-hashmap",
    category: "Complexity",
    front: "HashMap / HashSet: insert, delete, lookup?",
    back: "O(1) average, O(n) worst case (collisions). No ordering.",
  },
  {
    id: "cx-bst",
    category: "Complexity",
    front: "Balanced BST (TreeMap): search / insert / delete?",
    back: "O(log n). Keeps keys sorted - good for range queries & ordered iteration.",
  },
  {
    id: "cx-heap",
    category: "Complexity",
    front: "Binary Heap: push, pop, peek?",
    back: "push/pop O(log n), peek O(1). Build heap from array O(n).",
  },
  {
    id: "cx-binsearch",
    category: "Complexity",
    front: "Binary search on n elements?",
    back: "O(log n) time, O(1) space (iterative). Requires sorted input.",
  },
  {
    id: "cx-sort",
    category: "Complexity",
    front: "Comparison sort (merge/quick/heap sort)?",
    back: "O(n log n) time. Merge sort is stable O(n) space; quicksort O(log n) space, O(n²) worst.",
  },
  {
    id: "cx-dyn-array",
    category: "Complexity",
    front: "Dynamic array: append, index, insert-at-front?",
    back: "append O(1) amortized, index O(1), insert/delete at front O(n).",
  },
  {
    id: "cx-bfs",
    category: "Complexity",
    front: "BFS / DFS on a graph with V vertices, E edges?",
    back: "O(V + E) time, O(V) space (visited set + queue/stack).",
  },
  {
    id: "cx-dijkstra",
    category: "Complexity",
    front: "Dijkstra's shortest path (with a heap)?",
    back: "O((V + E) log V). No negative edges - use Bellman-Ford for those.",
  },
  {
    id: "cx-recursion",
    category: "Complexity",
    front: "Space cost of recursion depth d?",
    back: "O(d) on the call stack. Deep recursion can stack-overflow - consider iterative.",
  },

  // ---- Data structures ----
  {
    id: "ds-array-vs-ll",
    category: "Data Structures",
    front: "Array vs Linked List - when to pick which?",
    back: "Array: O(1) random access, cache-friendly. Linked list: O(1) insert/delete at known node, no random access.",
  },
  {
    id: "ds-stack-queue",
    category: "Data Structures",
    front: "Stack vs Queue?",
    back: "Stack = LIFO (DFS, undo, matching parens). Queue = FIFO (BFS, scheduling).",
  },
  {
    id: "ds-heap-use",
    category: "Data Structures",
    front: "When do you reach for a heap?",
    back: "Repeatedly need the min/max, top-K, streaming medians, Dijkstra, merge K sorted lists.",
  },
  {
    id: "ds-hash-use",
    category: "Data Structures",
    front: "When do you reach for a hash map?",
    back: "O(1) membership/frequency/dedup, two-sum complements, grouping by key, memoization.",
  },
  {
    id: "ds-set-vs-map",
    category: "Data Structures",
    front: "Set vs Map?",
    back: "Set = unique keys only (membership). Map = key→value associations. Both O(1) avg.",
  },
  {
    id: "ds-deque",
    category: "Data Structures",
    front: "What is a deque good for?",
    back: "O(1) push/pop at both ends. Sliding-window maximum (monotonic deque), BFS variants.",
  },

  // ---- Pitfalls ----
  {
    id: "pf-overflow",
    category: "Pitfalls",
    front: "Computing mid in binary search.",
    back: "Use mid = lo + (hi - lo) / 2 to avoid integer overflow, not (lo + hi) / 2.",
  },
  {
    id: "pf-offbyone",
    category: "Pitfalls",
    front: "Binary search loop bounds.",
    back: "Decide [lo, hi] vs [lo, hi) up front and keep it consistent - most bugs are off-by-one here.",
  },
  {
    id: "pf-visited",
    category: "Pitfalls",
    front: "Common bug in graph traversal.",
    back: "Forgetting to mark visited before/when enqueuing → infinite loops or TLE on cyclic graphs.",
  },
  {
    id: "pf-dp-base",
    category: "Pitfalls",
    front: "Most common DP bug.",
    back: "Wrong/missing base case or iterating states in the wrong order (dependencies not ready yet).",
  },
  {
    id: "pf-mutate",
    category: "Pitfalls",
    front: "Backtracking gotcha.",
    back: "Forgetting to undo the choice (restore state) after recursing, or sharing a mutable list reference.",
  },
  {
    id: "pf-empty",
    category: "Pitfalls",
    front: "Edge cases to always check.",
    back: "Empty input, single element, duplicates, negatives, integer overflow, and all-same values.",
  },
];
