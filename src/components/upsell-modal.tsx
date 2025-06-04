"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpsellModal({ isOpen, onClose }: UpsellModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <span>Upgrade to Pro</span>
          </DialogTitle>
          <DialogDescription>
            Unlock unlimited document uploads and advanced features.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="text-lg font-medium mb-4">Pro Plan Benefits:</h3>
          <ul className="space-y-3">
            {[
              "25 document uploads per month",
              "Advanced flashcard generation",
              "Full quiz generation",
              "Priority support",
              "Study progress tracking",
              "2 GB storage for your documents",
              "Create up to 10 folders",
            ].map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="sm:w-auto w-full"
          >
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="sm:w-auto w-full">
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
