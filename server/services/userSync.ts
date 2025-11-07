import { createClerkClient } from "@clerk/express";
import { storage } from "../storage";
import { UpsertUser, UserRole } from "@shared/schema";

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

export interface ClerkUserData {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string;
  imageUrl?: string;
  username?: string | null;
}

/**
 * Syncs a Clerk user with our database
 * Creates a new user if they don't exist, or updates existing user data
 */
export async function syncUserWithDatabase(clerkUserId: string): Promise<any> {
  try {
    // First, check if user already exists in our database
    let dbUser = await storage.getUser(clerkUserId);
    
    // Fetch user data from Clerk to check for metadata updates
    console.log(`Fetching user data from Clerk for: ${clerkUserId}`);
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    
    if (!clerkUser) {
      throw new Error(`User not found in Clerk: ${clerkUserId}`);
    }

    // Check if user should be an expert based on Clerk metadata
    const clerkMetadata = clerkUser.publicMetadata as any;
    const isExpert = clerkMetadata?.isExpert === true || clerkMetadata?.role === "expert";
    
    if (dbUser) {
      console.log(`User ${clerkUserId} already exists in database`);
      
      // Check if role needs to be updated based on Clerk metadata
      const shouldBeExpert = isExpert;
      const currentRole = dbUser.role;
      const expectedRole = shouldBeExpert ? "expert" : "user";
      const expectedProfileType = shouldBeExpert ? "tree" : "daisy";
      
      if (currentRole !== expectedRole || dbUser.defaultProfileType !== expectedProfileType) {
        console.log(`Updating user ${clerkUserId} role from ${currentRole} to ${expectedRole}`);
        
        // Update user with new role and profile type
        const updatedUser = await storage.upsertUser({
          ...dbUser,
          role: expectedRole,
          defaultProfileType: expectedProfileType,
          updatedAt: new Date(),
        });
        
        return updatedUser;
      }
      
      return dbUser;
    }

    // Extract data from Clerk user (already fetched above)
    const primaryEmail = clerkUser.emailAddresses.find(
      email => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    // Create username from email or use Clerk username
    const username = clerkUser.username || 
                    primaryEmail?.split('@')[0] || 
                    `user_${clerkUserId.slice(-8)}`;
    
    // Prepare user data for our database
    const userData: UpsertUser = {
      id: clerkUserId,
      username: username,
      email: primaryEmail,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      profileImageUrl: clerkUser.imageUrl,
      // Set password to a placeholder since we're using Clerk auth
      password: "clerk_managed_auth",
      role: isExpert ? "expert" as UserRole : "user" as UserRole,
      emailVerified: clerkUser.emailAddresses.some(email => 
        email.verification?.status === "verified"
      ),
      defaultProfileType: isExpert ? "tree" : "daisy",
    };

    console.log(`Creating new user in database:`, { 
      id: userData.id, 
      username: userData.username, 
      email: userData.email 
    });

    // Create user in our database
    const newUser = await storage.upsertUser(userData);
    
    console.log(`Successfully synced user ${clerkUserId} with database`);
    return newUser;
    
  } catch (error) {
    console.error(`Failed to sync user ${clerkUserId}:`, error);
    throw error;
  }
}

/**
 * Updates user metadata in Clerk (e.g., role information)
 */
export async function updateClerkUserMetadata(
  clerkUserId: string, 
  metadata: { role?: UserRole; [key: string]: any }
): Promise<void> {
  try {
    await clerkClient.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        ...metadata,
      },
    });
    
    console.log(`Updated Clerk metadata for user ${clerkUserId}:`, metadata);
  } catch (error) {
    console.error(`Failed to update Clerk metadata for ${clerkUserId}:`, error);
    throw error;
  }
}

/**
 * Gets user from database and ensures it's synced with Clerk
 */
export async function getUserWithSync(clerkUserId: string): Promise<any> {
  let dbUser = await storage.getUser(clerkUserId);
  
  if (!dbUser) {
    // User doesn't exist, sync from Clerk
    dbUser = await syncUserWithDatabase(clerkUserId);
  }
  
  return dbUser;
}