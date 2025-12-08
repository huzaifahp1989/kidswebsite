import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

export default function WhatsAppChannel() {
  const whatsappUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WHATSAPP_CHANNEL_URL) || "https://whatsapp.com/channel/";

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="max-w-3xl mx-auto">
        <Card className="border-2 border-emerald-300">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Islam Media WhatsApp Channel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-3 text-gray-800">Join our WhatsApp channel for updates, reminders, and competition announcements.</div>
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-emerald-500 text-white">Official Channel</Badge>
            </div>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Open WhatsApp Channel</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

