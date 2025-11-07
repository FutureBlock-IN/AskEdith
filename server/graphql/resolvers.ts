import { storage } from '../storage';
import { moderateContent } from '../moderation';
import { GraphQLScalarType, Kind } from 'graphql';

// Custom Date scalar
const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  Date: DateScalar,

  // Type resolvers for nested data
  User: {
    expertVerification: async (parent: any) => {
      return await storage.getExpertVerification(parent.id);
    },
    achievements: async (parent: any) => {
      return await storage.getUserAchievements(parent.id);
    },
    posts: async (parent: any) => {
      return await storage.getPostsByAuthor(parent.id);
    },
    comments: async (parent: any) => {
      // Would need to implement getCommentsByAuthor in storage
      return [];
    }
  },

  Category: {
    parent: async (parent: any) => {
      if (!parent.parentId) return null;
      return await storage.getCategoriesByParent(parent.parentId);
    },
    children: async (parent: any) => {
      return await storage.getCategoriesByParent(parent.id);
    },
    posts: async (parent: any) => {
      return await storage.getPosts(parent.id);
    }
  },

  Post: {
    category: async (parent: any) => {
      const categories = await storage.getCategories();
      return categories.find(cat => cat.id === parent.categoryId);
    },
    author: async (parent: any) => {
      return await storage.getUser(parent.authorId);
    },
    source: async (parent: any) => {
      return await storage.getPostSource(parent.id);
    },
    comments: async (parent: any) => {
      return await storage.getCommentsByPost(parent.id);
    },
    votes: async (parent: any) => {
      // Would need to implement getVotesByPost in storage
      return [];
    }
  },

  Comment: {
    post: async (parent: any) => {
      return await storage.getPost(parent.postId);
    },
    author: async (parent: any) => {
      return await storage.getUser(parent.authorId);
    },
    parent: async (parent: any) => {
      if (!parent.parentId) return null;
      // Would need to implement getComment in storage
      return null;
    },
    replies: async (parent: any) => {
      // Would need to implement getRepliesByComment in storage
      return [];
    },
    votes: async (parent: any) => {
      // Would need to implement getVotesByComment in storage
      return [];
    }
  },

  Vote: {
    user: async (parent: any) => {
      return await storage.getUser(parent.userId);
    }
  },

  UserAchievement: {
    user: async (parent: any) => {
      return await storage.getUser(parent.userId);
    },
    achievement: async (parent: any) => {
      const achievements = await storage.getAchievements();
      return achievements.find(ach => ach.id === parent.achievementId);
    }
  },

  ExpertVerification: {
    user: async (parent: any) => {
      return await storage.getUser(parent.userId);
    }
  },

  PostSource: {
    post: async (parent: any) => {
      return await storage.getPost(parent.postId);
    }
  },

  Query: {
    // User queries
    user: async (_: any, { id }: { id: string }) => {
      return await storage.getUser(id);
    },
    users: async (_: any, { limit = 20, offset = 0 }: { limit?: number; offset?: number }) => {
      // Would need to implement getUsers in storage
      return [];
    },
    currentUser: async (_: any, __: any, context: any) => {
      if (!context.user) return null;
      return await storage.getUser(context.user.id);
    },

    // Category queries
    categories: async () => {
      return await storage.getCategories();
    },
    category: async (_: any, { id, slug }: { id?: string; slug?: string }) => {
      if (id) {
        const categories = await storage.getCategories();
        return categories.find(cat => cat.id === parseInt(id));
      }
      if (slug) {
        return await storage.getCategoryBySlug(slug);
      }
      return null;
    },
    categoryHierarchy: async () => {
      return await storage.getCategoryHierarchy();
    },
    categoriesByLevel: async (_: any, { level }: { level: number }) => {
      return await storage.getCategoriesByLevel(level);
    },
    categoriesByParent: async (_: any, { parentId }: { parentId: string }) => {
      return await storage.getCategoriesByParent(parseInt(parentId));
    },

    // Post queries
    posts: async (_: any, { categoryId, limit = 20, offset = 0, authorId }: {
      categoryId?: string;
      limit?: number;
      offset?: number;
      authorId?: string;
    }) => {
      if (authorId) {
        return await storage.getPostsByAuthor(authorId, limit, offset);
      }
      return await storage.getPosts(categoryId ? parseInt(categoryId) : undefined, limit, offset);
    },
    post: async (_: any, { id }: { id: string }) => {
      return await storage.getPost(parseInt(id));
    },
    postsWithExpertInfo: async (_: any, { categoryId, limit = 20, offset = 0 }: {
      categoryId?: string;
      limit?: number;
      offset?: number;
    }) => {
      return await storage.getPostsWithExpertInfo(
        categoryId ? parseInt(categoryId) : undefined,
        limit,
        offset
      );
    },

    // Comment queries
    comments: async (_: any, { postId }: { postId: string }) => {
      return await storage.getCommentsByPost(parseInt(postId));
    },
    comment: async (_: any, { id }: { id: string }) => {
      // Would need to implement getComment in storage
      return null;
    },

    // Achievement queries
    achievements: async () => {
      return await storage.getAchievements();
    },
    userAchievements: async (_: any, { userId }: { userId: string }) => {
      return await storage.getUserAchievements(userId);
    },

    // Expert verification queries
    expertVerification: async (_: any, { userId }: { userId: string }) => {
      return await storage.getExpertVerification(userId);
    },
    verifiedExperts: async () => {
      return await storage.getVerifiedExperts();
    },
    featuredExperts: async () => {
      return await storage.getFeaturedExperts();
    },

    // Stats queries
    communityStats: async () => {
      return await storage.getCommunityStats();
    },

    // Moderation queries
    moderationQueue: async () => {
      return await storage.getModerationQueue();
    },
    moderationResult: async (_: any, { contentId }: { contentId: string }) => {
      return await storage.getModerationResult(contentId);
    }
  },

  Mutation: {
    // User mutations
    createUser: async (_: any, { input }: { input: any }) => {
      return await storage.createUser(input);
    },
    updateUser: async (_: any, { id, input }: { id: string; input: any }) => {
      // Would need to implement updateUser in storage
      const user = await storage.getUser(id);
      return user;
    },

    // Post mutations
    createPost: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Moderate content before creating
      const moderationResult = await moderateContent(input.content, 'post');
      if (moderationResult.status === 'rejected') {
        throw new Error(`Content rejected: ${moderationResult.reason}`);
      }

      const postData = {
        ...input,
        categoryId: parseInt(input.categoryId),
        authorId: context.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const post = await storage.createPost(postData);
      
      // Update category post count
      await storage.updateCategoryPostCount(postData.categoryId);
      
      // Check for achievements
      await storage.checkAndAwardAchievements(context.user.id);

      return post;
    },
    updatePost: async (_: any, { id, title, content, tags }: {
      id: string;
      title?: string;
      content?: string;
      tags?: string[];
    }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const post = await storage.getPost(parseInt(id));
      if (!post) {
        throw new Error('Post not found');
      }

      if (post.authorId !== context.user.id) {
        throw new Error('Not authorized to update this post');
      }

      // Would need to implement updatePost in storage
      return post;
    },
    updatePostHelpfulVotes: async (_: any, { id, increment }: { id: string; increment: number }) => {
      await storage.updatePostHelpfulVotes(parseInt(id), increment);
      return await storage.getPost(parseInt(id));
    },

    // Comment mutations
    createComment: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Moderate content before creating
      const moderationResult = await moderateContent(input.content, 'comment');
      if (moderationResult.status === 'rejected') {
        throw new Error(`Content rejected: ${moderationResult.reason}`);
      }

      const commentData = {
        ...input,
        postId: parseInt(input.postId),
        parentId: input.parentId ? parseInt(input.parentId) : null,
        authorId: context.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const comment = await storage.createComment(commentData);
      
      // Update post comment count
      await storage.updatePostCommentCount(commentData.postId, 1);
      
      // Check for achievements
      await storage.checkAndAwardAchievements(context.user.id);

      return comment;
    },
    updateCommentHelpfulVotes: async (_: any, { id, increment }: { id: string; increment: number }) => {
      await storage.updateCommentHelpfulVotes(parseInt(id), increment);
      // Would need to implement getComment in storage
      return null;
    },

    // Category mutations
    createCategory: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const categoryData = {
        ...input,
        parentId: input.parentId ? parseInt(input.parentId) : null,
        createdAt: new Date()
      };

      return await storage.createCategory(categoryData);
    },

    // Vote mutations
    createVote: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const voteData = {
        ...input,
        postId: input.postId ? parseInt(input.postId) : null,
        commentId: input.commentId ? parseInt(input.commentId) : null,
        userId: context.user.id,
        createdAt: new Date()
      };

      // Check if user already voted
      const existingVote = await storage.getUserVote(
        context.user.id,
        voteData.postId,
        voteData.commentId
      );

      if (existingVote) {
        // Remove existing vote
        await storage.deleteVote(context.user.id, voteData.postId, voteData.commentId);
        
        // Update helpful votes count
        const increment = voteData.voteType === 'helpful' ? -1 : 1;
        if (voteData.postId) {
          await storage.updatePostHelpfulVotes(voteData.postId, increment);
        } else if (voteData.commentId) {
          await storage.updateCommentHelpfulVotes(voteData.commentId, increment);
        }
      }

      const vote = await storage.createVote(voteData);
      
      // Update helpful votes count
      const increment = voteData.voteType === 'helpful' ? 1 : -1;
      if (voteData.postId) {
        await storage.updatePostHelpfulVotes(voteData.postId, increment);
      } else if (voteData.commentId) {
        await storage.updateCommentHelpfulVotes(voteData.commentId, increment);
      }

      return vote;
    },
    deleteVote: async (_: any, { postId, commentId }: { postId?: string; commentId?: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      await storage.deleteVote(
        context.user.id,
        postId ? parseInt(postId) : undefined,
        commentId ? parseInt(commentId) : undefined
      );

      return true;
    },

    // Expert verification mutations
    createExpertVerification: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const verificationData = {
        ...input,
        userId: context.user.id,
        status: 'pending',
        createdAt: new Date()
      };

      return await storage.createExpertVerification(verificationData);
    },
    verifyExpert: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      return await storage.verifyExpert(parseInt(id), context.user.id);
    },

    // Moderation mutations
    updateModerationStatus: async (_: any, { id, status }: { id: string; status: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      await storage.updateModerationStatus(parseInt(id), status, context.user.id);
      return await storage.getModerationResult(id);
    }
  }
};