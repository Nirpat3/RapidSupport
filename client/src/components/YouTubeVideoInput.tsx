import { useState } from 'react';
import { Youtube, Plus, X, Link2, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface YouTubeVideo {
  title: string;
  url: string;
  description?: string;
  tags?: string;
  id: string;
  videoId?: string;
  thumbnail?: string;
}

interface YouTubeVideoInputProps {
  onVideosChange: (videos: YouTubeVideo[]) => void;
  maxVideos?: number;
  className?: string;
}

export function YouTubeVideoInput({
  onVideosChange,
  maxVideos = 10,
  className,
}: YouTubeVideoInputProps) {
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [currentVideo, setCurrentVideo] = useState({
    title: '',
    url: '',
    description: '',
    tags: '',
  });
  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(null);

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Handle URL change to extract video ID and show thumbnail
  const handleUrlChange = (url: string) => {
    setCurrentVideo({ ...currentVideo, url });
    
    const videoId = extractYouTubeId(url);
    if (videoId) {
      setCurrentThumbnail(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
    } else {
      setCurrentThumbnail(null);
    }
  };

  // Add video to the list
  const handleAddVideo = () => {
    if (!currentVideo.url || !currentVideo.title) {
      return;
    }

    const videoId = extractYouTubeId(currentVideo.url);
    if (!videoId) {
      return;
    }

    const newVideo: YouTubeVideo = {
      ...currentVideo,
      id: Math.random().toString(36).substr(2, 9),
      videoId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };

    const updatedVideos = [...youtubeVideos, newVideo];
    setYoutubeVideos(updatedVideos);
    onVideosChange(updatedVideos);

    // Reset form
    setCurrentVideo({
      title: '',
      url: '',
      description: '',
      tags: '',
    });
    setCurrentThumbnail(null);
  };

  // Remove video from the list
  const handleRemoveVideo = (id: string) => {
    const updatedVideos = youtubeVideos.filter((v) => v.id !== id);
    setYoutubeVideos(updatedVideos);
    onVideosChange(updatedVideos);
  };

  const canAddVideo = currentVideo.url && currentVideo.title && extractYouTubeId(currentVideo.url) !== null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Add Video Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            <h4 className="text-sm font-semibold">Add YouTube Video</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL *</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="youtube-url"
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={currentVideo.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="pl-10"
                  data-testid="input-youtube-url"
                />
              </div>
              {currentVideo.url && !extractYouTubeId(currentVideo.url) && (
                <p className="text-xs text-destructive">Invalid YouTube URL</p>
              )}
            </div>

            {currentThumbnail && (
              <div className="relative aspect-video max-w-xs rounded-lg overflow-hidden border bg-muted">
                <img
                  src={currentThumbnail}
                  alt="Video preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="youtube-title">Video Title *</Label>
              <Input
                id="youtube-title"
                type="text"
                placeholder="Enter video title..."
                value={currentVideo.title}
                onChange={(e) => setCurrentVideo({ ...currentVideo, title: e.target.value })}
                data-testid="input-youtube-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-description">Description (Optional)</Label>
              <Textarea
                id="youtube-description"
                placeholder="Describe what this video covers..."
                value={currentVideo.description}
                onChange={(e) => setCurrentVideo({ ...currentVideo, description: e.target.value })}
                className="resize-none min-h-[80px]"
                data-testid="input-youtube-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-tags">Tags (Optional)</Label>
              <div className="relative">
                <TagIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="youtube-tags"
                  type="text"
                  placeholder="tutorial, setup, guide (comma-separated)"
                  value={currentVideo.tags}
                  onChange={(e) => setCurrentVideo({ ...currentVideo, tags: e.target.value })}
                  className="pl-10"
                  data-testid="input-youtube-tags"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleAddVideo}
              disabled={!canAddVideo || youtubeVideos.length >= maxVideos}
              className="w-full"
              data-testid="button-add-youtube-video"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Added Videos List */}
      {youtubeVideos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Added YouTube Videos ({youtubeVideos.length})</h4>
            {maxVideos && (
              <Badge variant="outline" className="text-xs">
                {youtubeVideos.length}/{maxVideos}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {youtubeVideos.map((video) => (
              <Card key={video.id} className="hover-elevate">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {video.thumbnail && (
                      <div className="relative w-32 aspect-video rounded overflow-hidden border bg-muted flex-shrink-0">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Youtube className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-sm font-medium line-clamp-1" title={video.title}>
                          {video.title}
                        </h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => handleRemoveVideo(video.id)}
                          data-testid={`button-remove-youtube-${video.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>

                      {video.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3" />
                          View on YouTube
                        </a>

                        {video.tags && (
                          <div className="flex gap-1 flex-wrap">
                            {video.tags.split(',').map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {youtubeVideos.length >= maxVideos && (
        <p className="text-xs text-amber-600">
          Maximum {maxVideos} YouTube videos allowed.
        </p>
      )}
    </div>
  );
}
