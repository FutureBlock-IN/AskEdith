import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Calendar, Clock, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_SLOTS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00"
];

interface AvailabilitySlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export default function ExpertAvailability() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
  });

  // Check if user is verified expert
  const { data: expertData, isLoading: expertLoading } = useQuery({
    queryKey: ["/api/experts/me"],
  });

  // Get current availability
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["/api/experts/my-availability"],
    enabled: !!expertData,
  });

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Add availability mutation
  const addAvailabilityMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/experts/availability", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experts/my-availability"] });
      toast({
        title: "Availability Added",
        description: "Your available hours have been updated.",
      });
      // Reset form
      setNewSlot({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add availability",
        variant: "destructive",
      });
    },
  });

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/experts/availability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experts/my-availability"] });
      toast({
        title: "Availability Removed",
        description: "Your available hours have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove availability",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate times
    const [startHour, startMin] = newSlot.startTime.split(":").map(Number);
    const [endHour, endMin] = newSlot.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }
    
    addAvailabilityMutation.mutate({
      ...newSlot,
      timezone: userTimezone,
    });
  };

  if (expertLoading || availabilityLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!expertData || expertData.verificationStatus !== "verified") {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            Only verified experts can manage their availability.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Manage Your Availability
          </h1>
          <p className="text-muted-foreground mt-2">
            Set your regular weekly hours for consultations
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/expert-dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Add new availability slot */}
        <Card>
          <CardHeader>
            <CardTitle>Add Available Hours</CardTitle>
            <CardDescription>
              Set recurring weekly time slots when you're available for consultations.
              Times are displayed in your local timezone: {userTimezone}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <Select
                    value={newSlot.dayOfWeek.toString()}
                    onValueChange={(value) => 
                      setNewSlot({ ...newSlot, dayOfWeek: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Select
                    value={newSlot.startTime}
                    onValueChange={(value) => 
                      setNewSlot({ ...newSlot, startTime: value })
                    }
                  >
                    <SelectTrigger id="startTime">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Select
                    value={newSlot.endTime}
                    onValueChange={(value) => 
                      setNewSlot({ ...newSlot, endTime: value })
                    }
                  >
                    <SelectTrigger id="endTime">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={addAvailabilityMutation.isPending}
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Current availability */}
        <Card>
          <CardHeader>
            <CardTitle>Your Weekly Schedule</CardTitle>
            <CardDescription>
              These are your recurring available hours each week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availability && availability.length > 0 ? (
              <div className="space-y-2">
                {availability
                  .sort((a: AvailabilitySlot, b: AvailabilitySlot) => {
                    if (a.dayOfWeek !== b.dayOfWeek) {
                      return a.dayOfWeek - b.dayOfWeek;
                    }
                    return a.startTime.localeCompare(b.startTime);
                  })
                  .map((slot: AvailabilitySlot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {DAYS_OF_WEEK.find(d => d.value === slot.dayOfWeek)?.label}
                        </span>
                        <span className="text-muted-foreground">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAvailabilityMutation.mutate(slot.id)}
                        disabled={deleteAvailabilityMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No availability set yet</p>
                <p className="text-sm mt-1">Add your available hours above to start accepting bookings</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              • Set your regular weekly hours when you're available for consultations
            </p>
            <p>
              • Clients will see available time slots based on your schedule
            </p>
            <p>
              • Booked appointments automatically block those time slots
            </p>
            <p>
              • You can block specific dates separately for holidays or time off
            </p>
            <p>
              • All times are shown in your local timezone: {userTimezone}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}