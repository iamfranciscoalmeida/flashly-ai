"use client";

import { useState, useEffect } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import SmartCollectionsGrid from "@/components/dashboard/smart-collections-grid";
import EnhancedStats from "@/components/dashboard/enhanced-stats";
import CollectionDetailModal from "@/components/dashboard/collection-detail-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartCollectionWithStats } from "@/types/database";
import { createClient } from "../../../supabase/client";
import { useRouter } from "next/navigation";
import { 
  Upload, 
  Sparkles, 
  MessageSquare,
  Loader2,
  Settings
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [collections, setCollections] = useState<SmartCollectionWithStats[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<SmartCollectionWithStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [organizingContent, setOrganizingContent] = useState(false);
  const [view, setView] = useState<'collections' | 'legacy'>('collections');
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user]);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/sign-in");
      return;
    }

    setUser(user);
    setIsPremium(user.user_metadata?.is_pro === true);
  };

  const fetchCollections = async () => {
    try {
      setCollectionsLoading(true);
      const response = await fetch('/api/dashboard/collections');
      
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCollections(data.collections || []);
        // If user has collections, show collections view by default
        if (data.collections?.length > 0) {
          setView('collections');
        }
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setCollectionsLoading(false);
    }
  };

  const handleOrganizeContent = async () => {
    try {
      console.log('🚀 Starting content organization...');
      setOrganizingContent(true);
      
      const response = await fetch('/api/dashboard/collections/organize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: {
            clear_existing: true,
            confidence_threshold: 0.6,
            max_collections: 15
          }
        }),
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Failed to organize content: ${response.status}`);
      }
      
              const data = await response.json();
        console.log('📊 Organization result:', data);
        
        // Show debug information
        if (data.debug?.content_found) {
          const { flashcards, quizzes, documents } = data.debug.content_found;
          const total = flashcards + quizzes + documents;
          console.log(`📚 Content found: ${total} items (${flashcards} flashcards, ${quizzes} quizzes, ${documents} documents)`);
          
          if (total === 0) {
            alert('No content found to organize! Please create some flashcards, quizzes, or upload documents first.');
            return;
          }
        }
        
        if (data.success) {
          console.log('✅ Organization successful, refreshing collections...');
          // Refresh collections
          await fetchCollections();
          setView('collections');
          
          // Show success message
          if (data.collections?.length > 0) {
            console.log(`🎉 Created ${data.collections.length} collections with ${data.items_organized} items`);
            alert(`Successfully created ${data.collections.length} collections with ${data.items_organized} items!`);
          } else {
            console.log('⚠️ No collections were created');
            alert('No collections were created. This might be due to insufficient content or low confidence scores.');
          }
        } else {
          console.error('❌ Organization failed:', data.error);
          alert(`Organization failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
      console.error('❌ Error organizing content:', error);
      alert(`Error organizing content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOrganizingContent(false);
    }
  };

  const handleCollectionClick = (collection: SmartCollectionWithStats) => {
    setSelectedCollection(collection);
    setIsModalOpen(true);
  };

  const handleStudySession = (collection: SmartCollectionWithStats, type: 'flashcards' | 'quiz' | 'mixed') => {
    // Navigate to study session with collection data
    router.push(`/dashboard/study?collection=${collection.id}&type=${type}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">
                  Welcome back
                  {user.user_metadata?.full_name
                    ? `, ${user.user_metadata.full_name}`
                    : ""}
                  !
                </h1>
                <p className="text-muted-foreground mt-1">
                  {view === 'collections' 
                    ? "Your AI-organized study collections"
                    : "Manage your study materials and generate flashcards"
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                  {isPremium ? "Pro Plan" : "Free Plan"}
                </div>
                {!isPremium && (
                  <Link href="/pricing">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Upgrade</span>
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView(view === 'collections' ? 'legacy' : 'collections')}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                  {view === 'collections' ? 'Legacy View' : 'Collections View'}
                </Button>
              </div>
            </div>
          </header>

          {/* Enhanced Stats */}
          <EnhancedStats userId={user.id} />

          {/* Main Dashboard Content */}
          {view === 'collections' ? (
            <div className="space-y-8">
              {/* Smart Collections */}
              <SmartCollectionsGrid
                collections={collections}
                loading={collectionsLoading}
                onCollectionClick={handleCollectionClick}
                onOrganizeContent={handleOrganizeContent}
              />

              {/* Quick Actions for new collections view */}
              {collections.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-500" />
                        <span>Upload Document</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add more study materials to your collections.
                      </p>
                      <Link href="/dashboard/upload">
                        <Button className="w-full sm:w-auto">Upload Document</Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-green-500" />
                        <span>AI Chat</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate content through AI conversations.
                      </p>
                      <Link href="/dashboard/chat">
                        <Button variant="outline" className="w-full sm:w-auto">
                          Start Chat
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <span>Reorganize</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Let AI reorganize your content into better collections.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={handleOrganizeContent}
                        disabled={organizingContent}
                      >
                        {organizingContent ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Organizing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Reorganize
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            /* Legacy Dashboard Layout */
            <div className="space-y-8">
              {/* Main Dashboard Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-500" />
                      <span>Upload Document</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your study materials to generate flashcards and
                      quizzes.
                    </p>
                    <Link href="/dashboard/upload">
                      <Button className="w-full sm:w-auto">Upload Document</Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      <span>Study Dashboard</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Access your flashcards, quizzes, and study materials.
                    </p>
                    <Link href="/dashboard/study">
                      <Button className="w-full sm:w-auto">
                        Go to Study Dashboard
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* AI Organization Prompt */}
              <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                    <h3 className="text-lg font-semibold mb-2">Organize Your Content with AI</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Let our AI analyze your study materials and organize them into smart collections by subject and topic.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleOrganizeContent}
                        disabled={organizingContent}
                        className="flex items-center gap-2"
                      >
                        {organizingContent ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Organizing Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Organize My Content
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/dashboard/debug');
                            const data = await response.json();
                            console.log('🔍 Database Debug Info:', data);
                            alert(`Debug Info (check console):\nCollections: ${data.debug?.collections?.count || 0}\nItems: ${data.debug?.collection_items?.count || 0}`);
                          } catch (error) {
                            console.error('Debug error:', error);
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        🔍 Debug DB
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Collection Detail Modal */}
      <CollectionDetailModal
        collection={selectedCollection}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCollection(null);
        }}
        onStudySession={handleStudySession}
      />
    </div>
  );
}
