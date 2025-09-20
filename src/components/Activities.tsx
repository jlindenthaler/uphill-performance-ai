import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityUpload } from './ActivityUpload';
import { ActivityReview } from './ActivityReview';

export function Activities() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activities</h1>
        <p className="text-muted-foreground mt-2">
          Upload and review your training activities
        </p>
      </div>

      <Tabs defaultValue="review" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="review">Activity Review</TabsTrigger>
          <TabsTrigger value="upload">Upload Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-6">
          <ActivityReview />
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <ActivityUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
}