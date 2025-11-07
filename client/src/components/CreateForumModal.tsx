import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const createForumSchema = z.object({
  name: z.string().min(3, "Forum name must be at least 3 characters").max(50, "Forum name must be less than 50 characters"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
});

interface CreateForumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateForumModal({ open, onOpenChange }: CreateForumModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof createForumSchema>>({
    resolver: zodResolver(createForumSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createForumMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createForumSchema>) => {
      return await apiRequest('POST', '/api/forums/create', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Forum created successfully",
        description: `Your forum "${data.forum.name}" has been created and is now available.`,
      });
      form.reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/forums/my-forums'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create forum",
        description: error.message || "There was an error creating your forum. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createForumSchema>) => {
    createForumMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] min-h-[600px]">
        <DialogHeader>
          <DialogTitle>Create Your Own Forum</DialogTitle>
          <DialogDescription>
            Create a community forum for discussions on topics that matter to you. 
            Your forum will be searchable but won't appear in the main sidebar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forum Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Caring for Parents with Alzheimer's" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a clear, descriptive name for your forum.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Share what this forum is about and what kind of discussions you hope to see..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help others understand what your forum is for.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={createForumMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createForumMutation.isPending}
              >
                {createForumMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Forum
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}