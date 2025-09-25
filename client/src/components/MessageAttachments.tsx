import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, File } from "lucide-react";

export interface MessageAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
  createdAt: string;
}

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4" />;
  } else if (mimeType === 'application/pdf') {
    return <FileText className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
};

const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export function MessageAttachments({ attachments, className }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleDownload = (attachment: MessageAttachment) => {
    const downloadUrl = `/api/attachments/${attachment.filename}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="border rounded-lg p-3 bg-card"
          data-testid={`attachment-${attachment.id}`}
        >
          {isImageFile(attachment.mimeType) ? (
            // Image preview
            <div className="space-y-2">
              <img
                src={`/api/attachments/${attachment.filename}`}
                alt={attachment.originalName}
                className="max-w-full max-h-48 rounded border object-cover"
                data-testid={`image-preview-${attachment.id}`}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <ImageIcon className="h-4 w-4" />
                  <span className="font-medium truncate" title={attachment.originalName}>
                    {attachment.originalName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(attachment.size)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  className="h-8 px-3"
                  data-testid={`button-download-${attachment.id}`}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            // File attachment
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {getFileIcon(attachment.mimeType)}
                <span className="font-medium truncate" title={attachment.originalName}>
                  {attachment.originalName}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(attachment.size)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(attachment)}
                className="h-8 px-3"
                data-testid={`button-download-${attachment.id}`}
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}