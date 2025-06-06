"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  CreditCard, 
  HelpCircle, 
  Layers,
  MessageSquare,
  TrendingUp,
  Activity,
  Loader2
} from "lucide-react";

interface DashboardStats {
  documents: number;
  flashcards: number;
  quizzes: number;
  collections: number;
  chat_sessions: number;
  recent_activity: {
    documents: number;
    flashcards: number;
    quizzes: number;
    chats: number;
    total: number;
  };
}

interface EnhancedStatsProps {
  userId: string;
}

export default function EnhancedStats({ userId }: EnhancedStatsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center h-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error loading stats: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: "Documents",
      value: stats.documents,
      icon: <FileText className="h-4 w-4" />,
      description: "Uploaded files",
      change: stats.recent_activity.documents > 0 ? `+${stats.recent_activity.documents} this week` : null,
      color: "text-blue-600"
    },
    {
      title: "Flashcards",
      value: stats.flashcards,
      icon: <CreditCard className="h-4 w-4" />,
      description: "Generated cards",
      change: stats.recent_activity.flashcards > 0 ? `+${stats.recent_activity.flashcards} this week` : null,
      color: "text-green-600"
    },
    {
      title: "Quizzes",
      value: stats.quizzes,
      icon: <HelpCircle className="h-4 w-4" />,
      description: "Practice questions",
      change: stats.recent_activity.quizzes > 0 ? `+${stats.recent_activity.quizzes} this week` : null,
      color: "text-purple-600"
    },
    {
      title: "Collections",
      value: stats.collections,
      icon: <Layers className="h-4 w-4" />,
      description: "Smart groupings",
      change: null,
      color: "text-orange-600"
    },
    {
      title: "Chat Sessions",
      value: stats.chat_sessions,
      icon: <MessageSquare className="h-4 w-4" />,
      description: "AI conversations",
      change: stats.recent_activity.chats > 0 ? `+${stats.recent_activity.chats} this week` : null,
      color: "text-teal-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={stat.color}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              {stat.change && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-green-600">{stat.change}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity summary */}
      {stats.recent_activity.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">This week</span>
                <span className="font-semibold">{stats.recent_activity.total} new items</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {stats.recent_activity.documents > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>{stats.recent_activity.documents} documents</span>
                  </div>
                )}
                {stats.recent_activity.flashcards > 0 && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-green-500" />
                    <span>{stats.recent_activity.flashcards} flashcards</span>
                  </div>
                )}
                {stats.recent_activity.quizzes > 0 && (
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-purple-500" />
                    <span>{stats.recent_activity.quizzes} quizzes</span>
                  </div>
                )}
                {stats.recent_activity.chats > 0 && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-teal-500" />
                    <span>{stats.recent_activity.chats} chats</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 