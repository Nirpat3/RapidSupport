import { useState, useRef, useCallback } from 'react';
import { Upload, X, ImageIcon, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

interface ImageUploadProps {
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function ImageUpload({
  onImagesChange,
  maxImages = 10,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  className,
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const newImages: UploadedImage[] = [];

      fileArray.forEach((file) => {
        // Check file type
        if (!acceptedTypes.includes(file.type)) {
          console.warn(`File ${file.name} is not a supported image type`);
          return;
        }

        // Check file size
        if (file.size > maxSizeBytes) {
          console.warn(`File ${file.name} is too large (max ${maxSizeBytes / 1024 / 1024}MB)`);
          return;
        }

        // Check if we're under the max images limit
        if (uploadedImages.length + validFiles.length >= maxImages) {
          console.warn(`Maximum ${maxImages} images allowed`);
          return;
        }

        validFiles.push(file);

        // Create preview URL
        const preview = URL.createObjectURL(file);
        const id = Math.random().toString(36).substr(2, 9);

        newImages.push({
          file,
          preview,
          id,
        });
      });

      if (newImages.length > 0) {
        setUploadedImages((prev) => [...prev, ...newImages]);
        const allFiles = [...uploadedImages.map(img => img.file), ...validFiles];
        onImagesChange(allFiles);
      }
    },
    [uploadedImages, maxImages, maxSizeBytes, acceptedTypes, onImagesChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    },
    [processFiles]
  );

  const removeImage = useCallback(
    (imageId: string) => {
      setUploadedImages((prev) => {
        const updated = prev.filter((img) => img.id !== imageId);
        const updatedFiles = updated.map(img => img.file);
        onImagesChange(updatedFiles);
        return updated;
      });
    },
    [onImagesChange]
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver
            ? "border-primary bg-primary/5 text-primary"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploadedImages.length >= maxImages && "opacity-50 cursor-not-allowed"
        )}
        data-testid="image-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploadedImages.length >= maxImages}
          data-testid="image-file-input"
        />

        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {isDragOver
                ? "Drop images here"
                : "Drag and drop images here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports JPG, PNG, GIF, WebP up to {maxSizeBytes / 1024 / 1024}MB each
              {uploadedImages.length > 0 && ` (${uploadedImages.length}/${maxImages})`}
            </p>
          </div>

          {uploadedImages.length < maxImages && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              data-testid="button-select-images"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Select Images
            </Button>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading images...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Image Previews */}
      {uploadedImages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selected Images ({uploadedImages.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg border bg-muted/30 overflow-hidden aspect-square"
                data-testid={`image-preview-${image.id}`}
              >
                <img
                  src={image.preview}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image.id)}
                    data-testid={`button-remove-image-${image.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {image.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadedImages.length >= maxImages && (
        <p className="text-xs text-amber-600">
          Maximum {maxImages} images allowed. Remove some images to add more.
        </p>
      )}
    </div>
  );
}