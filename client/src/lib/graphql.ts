export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: {
      code?: string;
    };
  }>;
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export async function graphqlRequest<T = any>(
  request: GraphQLRequest
): Promise<GraphQLResponse<T>> {
  try {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session-based auth
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const result: GraphQLResponse<T> = await response.json();
    
    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL Errors:', result.errors);
      throw new Error(result.errors[0].message);
    }

    return result;
  } catch (error) {
    console.error('GraphQL Request Failed:', error);
    throw error;
  }
}

// GraphQL Queries
export const GET_CATEGORIES = `
  query GetCategories {
    categories {
      id
      name
      description
      slug
      color
      icon
      postCount
      parentId
      level
      orderIndex
      children {
        id
        name
        description
        slug
        color
        icon
        postCount
        level
      }
    }
  }
`;

export const GET_CATEGORY_HIERARCHY = `
  query GetCategoryHierarchy {
    categoryHierarchy {
      id
      name
      description
      slug
      color
      icon
      postCount
      parentId
      level
      orderIndex
      children {
        id
        name
        description
        slug
        color
        icon
        postCount
        level
        orderIndex
        children {
          id
          name
          description
          slug
          color
          icon
          postCount
          level
          orderIndex
        }
      }
    }
  }
`;

export const GET_POSTS = `
  query GetPosts($categoryId: ID, $limit: Int, $offset: Int) {
    posts(categoryId: $categoryId, limit: $limit, offset: $offset) {
      id
      title
      content
      isResolved
      isSticky
      helpfulVotes
      commentCount
      viewCount
      createdAt
      updatedAt
      tags
      category {
        id
        name
        slug
        color
        icon
      }
      author {
        id
        username
        firstName
        lastName
        communityName
        profileImageUrl
        reputation
      }
    }
  }
`;

export const GET_POST = `
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      title
      content
      isResolved
      isSticky
      helpfulVotes
      commentCount
      viewCount
      createdAt
      updatedAt
      tags
      category {
        id
        name
        slug
        color
        icon
      }
      author {
        id
        username
        firstName
        lastName
        communityName
        profileImageUrl
        reputation
        expertVerification {
          specialization
          status
          isFeatured
          rating
        }
      }
      comments {
        id
        content
        helpfulVotes
        createdAt
        author {
          id
          username
          firstName
          lastName
          communityName
          profileImageUrl
        }
      }
    }
  }
`;

export const GET_COMMUNITY_STATS = `
  query GetCommunityStats {
    communityStats {
      totalUsers
      totalPosts
      totalComments
      postsThisWeek
    }
  }
`;

// GraphQL Mutations
export const CREATE_POST = `
  mutation CreatePost($input: PostInput!) {
    createPost(input: $input) {
      id
      title
      content
      createdAt
      category {
        id
        name
        slug
      }
      author {
        id
        username
        firstName
        lastName
      }
    }
  }
`;

export const CREATE_COMMENT = `
  mutation CreateComment($input: CommentInput!) {
    createComment(input: $input) {
      id
      content
      createdAt
      author {
        id
        username
        firstName
        lastName
      }
    }
  }
`;

export const CREATE_VOTE = `
  mutation CreateVote($input: VoteInput!) {
    createVote(input: $input) {
      id
      voteType
      createdAt
    }
  }
`;

export const DELETE_VOTE = `
  mutation DeleteVote($postId: ID, $commentId: ID) {
    deleteVote(postId: $postId, commentId: $commentId)
  }
`;

// Type definitions for better TypeScript support
export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  color: string;
  icon: string;
  postCount?: number;
  parentId?: string;
  level?: number;
  orderIndex?: number;
  children?: Category[];
}

export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  communityName?: string;
  profileImageUrl?: string;
  reputation?: number;
  expertVerification?: {
    specialization: string;
    status: string;
    isFeatured: boolean;
    rating?: number;
  };
}

export interface Post {
  id: string;
  title: string;
  content: string;
  isResolved?: boolean;
  isSticky?: boolean;
  helpfulVotes?: number;
  commentCount?: number;
  viewCount?: number;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  category: Category;
  author: User;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  helpfulVotes?: number;
  createdAt: string;
  author: User;
}

export interface CommunityStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  postsThisWeek: number;
}

export interface PostInput {
  title: string;
  content: string;
  categoryId: string;
  tags?: string[];
  isSticky?: boolean;
}

export interface CommentInput {
  content: string;
  postId: string;
  parentId?: string;
}

export interface VoteInput {
  postId?: string;
  commentId?: string;
  voteType: string;
}