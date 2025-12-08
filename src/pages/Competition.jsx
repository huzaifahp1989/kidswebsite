import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Gift, Smartphone, Link as LinkIcon } from "lucide-react";

export default function Competition() {
  const whatsappUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WHATSAPP_CHANNEL_URL) || "https://whatsapp.com/channel/";
  const quizUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdECoRPciubKc8emwMo-OFoWldLBnUVAoxebjAG-9KD287t1g/viewform";

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-amber-300 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-amber-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Competition
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-gray-800 font-semibold mb-2">Chance to win:</div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-amber-500 text-white">Chrome Laptop</Badge>
              <Badge className="bg-amber-500 text-white">Tablet</Badge>
              <Badge className="bg-amber-500 text-white">Cash</Badge>
              <Badge className="bg-amber-500 text-white">Vouchers</Badge>
            </div>
            <div className="text-sm text-gray-700 mb-4">Under 14 years, boys and girls.</div>
            <div className="space-y-3">
              <div className="p-3 border rounded bg-white flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800">
                  <Smartphone className="w-4 h-4 text-blue-600" /> Download the app
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a href="/QuizSignup">Sign up</a>
                </Button>
              </div>
              <div className="p-3 border rounded bg-white flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800">
                  <LinkIcon className="w-4 h-4 text-green-600" /> Answer the quiz form
                </div>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <a href={quizUrl} target="_blank" rel="noopener noreferrer">Open Quiz</a>
                </Button>
              </div>
              <div className="p-3 border rounded bg-white flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800">
                  <Gift className="w-4 h-4 text-emerald-600" /> Join Islam Media WhatsApp Channel
                </div>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Join Channel</a>
                </Button>
              </div>
              <div className="p-3 border rounded bg-white">
                <div className="text-gray-800 font-medium">Fundraise £100 for Gaza</div>
                <div className="text-sm text-gray-700">Ask friends and family and donate to Al Ianah Humanity Welfare.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

