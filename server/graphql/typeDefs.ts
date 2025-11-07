import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar Date

  type User {
    id: ID!
    username: String!
    email: String
    firstName: String
    lastName: String
    communityName: String
    profileImageUrl: String
    bio: String
    location: String
    website: String
    socialLinksTwitter: String
    socialLinksLinkedin: String
    socialLinksFacebook: String
    joinedAt: Date
    lastActiveAt: Date
    reputation: Int
    expertVerification: ExpertVerification
    achievements: [UserAchievement!]!
    posts: [Post!]!
    comments: [Comment!]!
  }

  type Category {
    id: ID!
    name: String!
    description: String
    slug: String!
    color: String!
    icon: String!
    postCount: Int
    parentId: ID
    level: Int
    orderIndex: Int
    createdAt: Date
    parent: Category
    children: [Category!]!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    category: Category!
    author: User!
    isResolved: Boolean
    isSticky: Boolean
    helpfulVotes: Int
    commentCount: Int
    viewCount: Int
    createdAt: Date
    updatedAt: Date
    tags: [String!]
    source: PostSource
    comments: [Comment!]!
    votes: [Vote!]!
  }

  type Comment {
    id: ID!
    content: String!
    post: Post!
    author: User!
    parentId: ID
    helpfulVotes: Int
    createdAt: Date
    updatedAt: Date
    parent: Comment
    replies: [Comment!]!
    votes: [Vote!]!
  }

  type Vote {
    id: ID!
    user: User!
    postId: ID
    commentId: ID
    voteType: String!
    createdAt: Date
  }

  type Achievement {
    id: ID!
    name: String!
    description: String!
    icon: String!
    category: String!
    points: Int!
    requirements: String!
    createdAt: Date
  }

  type UserAchievement {
    id: ID!
    user: User!
    achievement: Achievement!
    earnedAt: Date!
    progress: Int
  }

  type ExpertVerification {
    id: ID!
    user: User!
    specialization: String!
    credentials: String!
    experience: String!
    portfolio: String
    status: String!
    verifiedAt: Date
    verifiedBy: String
    isFeatured: Boolean
    rating: Float
    reviewCount: Int
  }

  type PostSource {
    id: ID!
    post: Post!
    sourceType: String!
    sourceUrl: String
    sourceTitle: String
    sourceAuthor: String
    publishedAt: Date
    reliability: String
    createdAt: Date
  }

  type CommunityStats {
    totalUsers: Int!
    totalPosts: Int!
    totalComments: Int!
    postsThisWeek: Int!
  }

  type ModerationResult {
    id: ID!
    contentId: String!
    contentType: String!
    score: Float!
    flaggedCategories: [String!]!
    status: String!
    reason: String!
    reviewedBy: String
    createdAt: Date
    updatedAt: Date
  }

  input PostInput {
    title: String!
    content: String!
    categoryId: ID!
    tags: [String!]
    isSticky: Boolean
  }

  input CommentInput {
    content: String!
    postId: ID!
    parentId: ID
  }

  input CategoryInput {
    name: String!
    description: String
    slug: String!
    color: String!
    icon: String!
    parentId: ID
    level: Int
    orderIndex: Int
  }

  input UserInput {
    username: String!
    email: String!
    firstName: String
    lastName: String
    communityName: String
    bio: String
    location: String
    website: String
    socialLinksTwitter: String
    socialLinksLinkedin: String
    socialLinksFacebook: String
  }

  input VoteInput {
    postId: ID
    commentId: ID
    voteType: String!
  }

  input ExpertVerificationInput {
    specialization: String!
    credentials: String!
    experience: String!
    portfolio: String
  }

  type Query {
    # User queries
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!
    currentUser: User

    # Category queries
    categories: [Category!]!
    category(id: ID, slug: String): Category
    categoryHierarchy: [Category!]!
    categoriesByLevel(level: Int!): [Category!]!
    categoriesByParent(parentId: ID!): [Category!]!

    # Post queries
    posts(categoryId: ID, limit: Int, offset: Int, authorId: ID): [Post!]!
    post(id: ID!): Post
    postsWithExpertInfo(categoryId: ID, limit: Int, offset: Int): [Post!]!

    # Comment queries
    comments(postId: ID!): [Comment!]!
    comment(id: ID!): Comment

    # Achievement queries
    achievements: [Achievement!]!
    userAchievements(userId: ID!): [UserAchievement!]!

    # Expert verification queries
    expertVerification(userId: ID!): ExpertVerification
    verifiedExperts: [ExpertVerification!]!
    featuredExperts: [ExpertVerification!]!

    # Stats queries
    communityStats: CommunityStats!

    # Moderation queries
    moderationQueue: [ModerationResult!]!
    moderationResult(contentId: String!): ModerationResult
  }

  type Mutation {
    # User mutations
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!

    # Post mutations
    createPost(input: PostInput!): Post!
    updatePost(id: ID!, title: String, content: String, tags: [String!]): Post!
    deletePost(id: ID!): Boolean!
    updatePostHelpfulVotes(id: ID!, increment: Int!): Post!

    # Comment mutations
    createComment(input: CommentInput!): Comment!
    updateComment(id: ID!, content: String!): Comment!
    deleteComment(id: ID!): Boolean!
    updateCommentHelpfulVotes(id: ID!, increment: Int!): Comment!

    # Category mutations
    createCategory(input: CategoryInput!): Category!
    updateCategory(id: ID!, input: CategoryInput!): Category!

    # Vote mutations
    createVote(input: VoteInput!): Vote!
    deleteVote(postId: ID, commentId: ID): Boolean!

    # Expert verification mutations
    createExpertVerification(input: ExpertVerificationInput!): ExpertVerification!
    updateExpertVerification(id: ID!, input: ExpertVerificationInput!): ExpertVerification!
    verifyExpert(id: ID!): ExpertVerification!

    # Moderation mutations
    updateModerationStatus(id: ID!, status: String!): ModerationResult!
  }

  type Subscription {
    postAdded(categoryId: ID): Post!
    commentAdded(postId: ID!): Comment!
    userOnline(userId: ID!): User!
  }
`;