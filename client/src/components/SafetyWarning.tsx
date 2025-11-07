import { AlertTriangle, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

interface SafetyWarningProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

export default function SafetyWarning({ open, onClose, url }: SafetyWarningProps) {
  const handleProceed = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                External Link Warning
              </DialogTitle>
              <p className="text-sm text-gray-500">You're leaving our safe community</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {url && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="w-4 h-4" />
                <span className="font-mono break-all">{getDomainFromUrl(url)}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <p className="text-gray-600">
              This link leads outside our community. Please verify the source before sharing any personal information. 
              Our community guidelines don't apply to external sites.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Safety Reminder:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Never share personal contact information</li>
                    <li>• Be cautious of requests for money or personal details</li>
                    <li>• Verify credentials of any service providers</li>
                    <li>• Report suspicious links to our moderation team</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Stay Here
            </Button>
            <Button 
              onClick={handleProceed}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              Continue Anyway
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            By continuing, you acknowledge that you understand the risks of visiting external websites.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
