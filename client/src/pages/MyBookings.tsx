import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, DollarSign, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function MyBookings() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['/api/consultations/my-bookings'],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">
              Please log in to view your bookings.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.scheduledAt);
    if (filter === 'upcoming') return bookingDate >= now;
    if (filter === 'past') return bookingDate < now;
    return true;
  });

  const getStatusBadge = (status: string, scheduledAt: string) => {
    const isUpcoming = new Date(scheduledAt) >= now;
    
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    } else if (status === 'completed') {
      return <Badge variant="default">Completed</Badge>;
    } else if (isUpcoming) {
      return <Badge variant="secondary">Upcoming</Badge>;
    } else {
      return <Badge variant="outline">Past</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-coral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">My Consultations</CardTitle>
            <CardDescription>
              View and manage your booked consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({bookings.length})
              </Button>
              <Button
                variant={filter === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('upcoming')}
              >
                Upcoming ({bookings.filter(b => new Date(b.scheduledAt) >= now).length})
              </Button>
              <Button
                variant={filter === 'past' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('past')}
              >
                Past ({bookings.filter(b => new Date(b.scheduledAt) < now).length})
              </Button>
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  {filter === 'upcoming' ? 'No upcoming consultations' : 
                   filter === 'past' ? 'No past consultations' : 
                   'No consultations booked yet'}
                </p>
                <Button onClick={() => window.location.href = '/experts'}>
                  Browse Experts
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <Card key={booking.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">
                            Consultation with {booking.expert?.firstName && booking.expert?.lastName 
                              ? `${booking.expert.firstName} ${booking.expert.lastName}`
                              : booking.expert?.name || 'Expert'}
                          </h3>
                          {getStatusBadge(booking.bookingStatus, booking.scheduledAt)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{format(new Date(booking.scheduledAt), 'MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>
                            {format(new Date(booking.scheduledAt), 'h:mm a')} ({booking.duration} min)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span>${(booking.totalAmount / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">
                            {booking.notes || 'No notes added'}
                          </span>
                        </div>
                      </div>

                      {booking.bookingStatus === 'scheduled' && new Date(booking.scheduledAt) > now && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600 mb-2">
                            Join link will be sent via email 30 minutes before the consultation
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}