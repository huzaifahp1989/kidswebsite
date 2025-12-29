import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Gift, Smartphone, Link as LinkIcon, Share2 } from "lucide-react";

export default function Competition() {
  const whatsappUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WHATSAPP_CHANNEL_URL) || "https://whatsapp.com/channel/0029Va92vStJUM2e613x5B3E";
  const quizUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdECoRPciubKc8emwMo-OFoWldLBnUVAoxebjAG-9KD287t1g/viewform";
  const fundraiserUrl = "https://campaigns.givebrite.com/fundraiser/stand-with-gaza-your-help-can-save-lives-1";
  const [shareMsg, setShareMsg] = React.useState("");

  const openExternal = (url) => {
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) {
        window.location.assign(url);
      }
    } catch {
      window.location.assign(url);
    }
  };

  const handleShareFundraiser = async () => {
    setShareMsg("");
    try {
      const text = "Please support Gaza by donating:";
      if (navigator.share) {
        await navigator.share({ title: "Fundraise for Gaza", text, url: fundraiserUrl });
        setShareMsg("Shared successfully");
      } else {
        await navigator.clipboard?.writeText?.(fundraiserUrl);
        setShareMsg("Link copied to clipboard");
      }
    } catch {
      setShareMsg("Unable to share right now");
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-amber-300 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-amber-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Competition
            </CardTitle>
            <div className="text-xs text-white/85 mt-1">Competition is live till Feb 2026</div>
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
              <div className="p-3 border rounded bg-white flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-gray-800">
                  <Smartphone className="w-4 h-4 text-blue-600" /> Download the app
                </div>
                <Button asChild className="w-full sm:w-auto sm:ml-auto bg-blue-600 hover:bg-blue-700">
                  <a href="/Games">Play Games</a>
                </Button>
              </div>
              <div className="p-3 border rounded bg-white flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-gray-800">
                  <LinkIcon className="w-4 h-4 text-green-600" /> Answer the quiz form
                </div>
                <Button className="w-full sm:w-auto sm:ml-auto bg-green-600 hover:bg-green-700" onClick={() => openExternal(quizUrl)}>
                  Open Quiz
                </Button>
              </div>
              <div className="p-3 border rounded bg-white flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-gray-800">
                  <Gift className="w-4 h-4 text-emerald-600" /> Join Islam Media WhatsApp Channel
                </div>
                <Button className="w-full sm:w-auto sm:ml-auto bg-emerald-600 hover:bg-emerald-700" onClick={() => openExternal(whatsappUrl)}>
                  Join Channel
                </Button>
              </div>
              <div className="p-3 border rounded bg-white">
                <div className="text-gray-800 font-medium">Raise £50–£100 for Gaza</div>
                <div className="text-sm text-gray-700 mb-3">Ask friends and family to contribute and donate securely.</div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <Button className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700" onClick={() => openExternal(fundraiserUrl)}>
                    Open Fundraiser
                  </Button>
                  <Button type="button" onClick={handleShareFundraiser} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Share with others
                  </Button>
                </div>
                {shareMsg ? <div className="mt-2 text-xs text-gray-600">{shareMsg}</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
