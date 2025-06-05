"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  X,
  Brain,
  Target,
  Zap,
  Settings,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface GenerationSettings {
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface GenerationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (settings: GenerationSettings) => void;
  type: 'flashcards' | 'quiz';
  isLoading?: boolean;
}

export function GenerationSettingsModal({
  isOpen,
  onClose,
  onGenerate,
  type,
  isLoading = false,
}: GenerationSettingsModalProps) {
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [difficultyDistribution, setDifficultyDistribution] = useState({
    easy: 30,
    medium: 50,
    hard: 20,
  });

  const handleCountChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0 && num <= 50) {
      setCount(num);
    }
  };

  const handleDistributionChange = (level: keyof typeof difficultyDistribution, value: number[]) => {
    const newValue = value[0];
    const others = Object.keys(difficultyDistribution).filter(k => k !== level) as (keyof typeof difficultyDistribution)[];
    
    // Adjust other values proportionally
    const remaining = 100 - newValue;
    const currentOthersSum = others.reduce((sum, key) => sum + difficultyDistribution[key], 0);
    
    const newDistribution = { ...difficultyDistribution };
    newDistribution[level] = newValue;
    
    if (currentOthersSum > 0) {
      others.forEach(key => {
        newDistribution[key] = Math.round((difficultyDistribution[key] / currentOthersSum) * remaining);
      });
    } else {
      const equalShare = Math.round(remaining / others.length);
      others.forEach(key => {
        newDistribution[key] = equalShare;
      });
    }
    
    // Ensure sum equals 100
    const actualSum = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
    if (actualSum !== 100) {
      const diff = 100 - actualSum;
      newDistribution[others[0]] += diff;
    }
    
    setDifficultyDistribution(newDistribution);
  };

  const handleGenerate = () => {
    const settings: GenerationSettings = {
      count,
      difficulty,
      difficultyDistribution,
    };
    onGenerate(settings);
  };

  const getIcon = () => {
    return type === 'flashcards' ? <Brain className="h-5 w-5" /> : <Target className="h-5 w-5" />;
  };

  const getTitle = () => {
    return type === 'flashcards' ? 'Generate Flashcards' : 'Generate Quiz';
  };

  const getDescription = () => {
    return type === 'flashcards' 
      ? 'Customize your flashcard generation settings'
      : 'Customize your quiz generation settings';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Count Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Number of {type}
            </Label>
            <div className="flex items-center space-x-4">
              <Slider
                value={[count]}
                onValueChange={(value) => setCount(value[0])}
                max={50}
                min={5}
                step={5}
                className="flex-1"
              />
              <Input
                type="number"
                value={count}
                onChange={(e) => handleCountChange(e.target.value)}
                className="w-20"
                min="5"
                max="50"
              />
            </div>
            <p className="text-xs text-gray-500">
              Choose between 5-50 {type}
            </p>
          </div>

          {/* Difficulty Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Difficulty Level
            </Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(value: 'easy' | 'medium' | 'hard' | 'mixed') => setDifficulty(value)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easy" id="easy" />
                <Label htmlFor="easy" className="text-sm cursor-pointer">
                  Easy Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-sm cursor-pointer">
                  Medium Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard" className="text-sm cursor-pointer">
                  Hard Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mixed" id="mixed" />
                <Label htmlFor="mixed" className="text-sm cursor-pointer">
                  Mixed Difficulty
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Difficulty Distribution (only show when mixed is selected) */}
          {difficulty === 'mixed' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Difficulty Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Easy */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-green-600">Easy</Label>
                    <span className="text-sm text-green-600 font-medium">
                      {difficultyDistribution.easy}%
                    </span>
                  </div>
                  <Slider
                    value={[difficultyDistribution.easy]}
                    onValueChange={(value) => handleDistributionChange('easy', value)}
                    max={80}
                    min={0}
                    step={5}
                    className="easy-slider"
                  />
                </div>

                {/* Medium */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-yellow-600">Medium</Label>
                    <span className="text-sm text-yellow-600 font-medium">
                      {difficultyDistribution.medium}%
                    </span>
                  </div>
                  <Slider
                    value={[difficultyDistribution.medium]}
                    onValueChange={(value) => handleDistributionChange('medium', value)}
                    max={80}
                    min={0}
                    step={5}
                    className="medium-slider"
                  />
                </div>

                {/* Hard */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-red-600">Hard</Label>
                    <span className="text-sm text-red-600 font-medium">
                      {difficultyDistribution.hard}%
                    </span>
                  </div>
                  <Slider
                    value={[difficultyDistribution.hard]}
                    onValueChange={(value) => handleDistributionChange('hard', value)}
                    max={80}
                    min={0}
                    step={5}
                    className="hard-slider"
                  />
                </div>

                <div className="pt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Total: {Object.values(difficultyDistribution).reduce((sum, val) => sum + val, 0)}%
                  </div>
                  <p>
                    Approximately {Math.round(count * difficultyDistribution.easy / 100)} easy,{' '}
                    {Math.round(count * difficultyDistribution.medium / 100)} medium,{' '}
                    {Math.round(count * difficultyDistribution.hard / 100)} hard
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {getIcon()}
                Generate {count} {type}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 