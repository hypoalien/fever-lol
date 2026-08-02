"use client";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrashIcon, UploadIcon } from "lucide-react";
import axios from "axios";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { Input } from "./ui/input";
import type { EventFormSectionProps } from "@/types/event-form";

export function EventFlyer({ form }: EventFormSectionProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const existingUrl = form.getValues("eventFlyer");
    if (existingUrl && typeof existingUrl === "string") {
      setPreviewUrl(existingUrl);
    }
  }, [form]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];

    // Create preview URL for the file
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const { data } = await axios.post("/api/events/get-flyer-upload-url", {
        params: {
          fileName: file.name,
          fileType: file.type,
        },
      });
      const { signedRequest, url } = data;

      await axios.put(signedRequest, file, {
        headers: {
          "Content-Type": file.type,
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / (progressEvent.total || 1)) * 100
          );
          setUploadProgress(progress);
        },
      });

      // Update the form with the S3 URL
      form.setValue("eventFlyer", url);
      setPreviewUrl(url);

      // Cleanup the temporary object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Error uploading image", error);
    }
  };

  const handleClearImage = () => {
    form.setValue("eventFlyer", null);
    setPreviewUrl(null);
    setUploadProgress(0);
    // Only cleanup if it's an object URL (not an S3 URL)
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Flyer</CardTitle>
        <CardDescription>Upload your Event flyer</CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="eventFlyer"
          render={({ field: {} }) => (
            <FormItem>
              <FormControl>
                <div className="grid gap-4">
                  <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 transition-colors hover:border-muted-foreground/50">
                    {previewUrl ? (
                      <div className="relative w-full aspect-video">
                        <Image
                          src={previewUrl}
                          alt="Event flyer preview"
                          fill
                          className="rounded-md object-cover"
                          priority={true}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleClearImage}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-8">
                        <UploadIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drag & drop or click to upload
                        </p>
                      </div>
                    )}
                  </div>

                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="eventFlyer"
                    onChange={handleImageUpload} // Move this after {...field} to override the default onChange
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      document.getElementById("eventFlyer")?.click()
                    }
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Select Image
                  </Button>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress value={uploadProgress} className="mt-4" />
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload an image for your event flyer (PNG, JPG up to 5MB)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
