import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { 
  Check, 
  Lock, 
  Globe, 
  Search, 
  Database, 
  Grid3x3, 
  Brain, 
  FileText, 
  Loader2,
  X
} from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

const scanningSteps = [
  { id: 1, message: "Connecting to website…", duration: 2000, icon: Globe },
  { id: 2, message: "Fetching page structure…", duration: 2500, icon: FileText },
  { id: 3, message: "Analyzing SEO signals…", duration: 3000, icon: Search },
  { id: 4, message: "Evaluating structured data…", duration: 2500, icon: Database },
  { id: 5, message: "Measuring UX clarity…", duration: 2000, icon: Grid3x3 },
  { id: 6, message: "Calculating AI readiness score…", duration: 2500, icon: Brain },
  { id: 7, message: "Generating personalized report…", duration: 2000, icon: FileText },
];

interface ScanningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteUrl: string;
}

export function ScanningModal({ open, onOpenChange, websiteUrl }: ScanningModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showStopDialog, setShowStopDialog] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setProgress(0);
      setCurrentStep(0);
      setCompletedSteps([]);
      return;
    }

    // Progress animation
    const totalDuration = scanningSteps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;
    let lastStep = -1;
    const completed = new Set<number>();
    
    const interval = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Update current step based on elapsed time
      let accumulatedTime = 0;
      let currentStepIndex = 0;
      
      for (let i = 0; i < scanningSteps.length; i++) {
        accumulatedTime += scanningSteps[i].duration;
        if (elapsed < accumulatedTime) {
          currentStepIndex = i;
          break;
        } else {
          // Mark this step as completed
          completed.add(scanningSteps[i].id);
        }
      }

      // Only update if step changed
      if (currentStepIndex !== lastStep) {
        lastStep = currentStepIndex;
        setCurrentStep(currentStepIndex);
        setCompletedSteps(Array.from(completed));
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        // Mark all steps as completed
        setCompletedSteps(scanningSteps.map(s => s.id));
        setCurrentStep(scanningSteps.length - 1);
        setProgress(100);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [open]); // Only depend on 'open', not 'completedSteps'

  const handleStopScan = () => {
    setShowStopDialog(false);
    onOpenChange(false);
  };

  const handleDownloadReport = () => {
    // Placeholder for PDF download
    console.log("Downloading report...");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-3xl p-0 border-0 bg-transparent shadow-none overflow-visible"
          hideCloseButton
          aria-describedby="scanning-description"
        >
          <span id="scanning-description" className="sr-only">
            AI website scanning and analysis in progress
          </span>
          <div className="relative">
            {/* Radial glow behind modal */}
            <div className="absolute inset-0 -z-10">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-accent/30 via-purple-500/30 to-blue-500/30 blur-3xl rounded-full scale-150"
                animate={{
                  scale: [1.5, 1.7, 1.5],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            {/* Main scanning card with floating animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: [0, -8, 0] 
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                y: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              }}
              className="relative bg-gradient-to-br from-[#0A0F1E] via-[#0F172A] to-[#1a1f3a] rounded-3xl shadow-2xl overflow-hidden border border-white/10"
            >
              {/* Gradient border effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/30 via-purple-500/30 to-blue-500/30 p-[1px] pointer-events-none">
                <div className="w-full h-full bg-gradient-to-br from-[#0A0F1E] via-[#0F172A] to-[#1a1f3a] rounded-3xl" />
              </div>

              {/* Subtle shimmer effect */}
              <motion.div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(91, 91, 214, 0.3), transparent)",
                }}
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 1,
                }}
              />

              <div className="relative z-10 p-10">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {/* Close button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowStopDialog(true)}
                        className="absolute top-6 right-6 text-gray-400 hover:text-gray-300 transition-colors h-auto p-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>

                      {/* Website URL - Locked */}
                      <div className="flex items-center justify-center gap-3 mb-8">
                        <Lock className="h-4 w-4 text-gray-400" />
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
                          <span className="text-sm text-gray-400">Scanning:</span>
                          <span className="text-sm text-white font-medium">{websiteUrl}</span>
                        </div>
                      </div>

                      {/* Large circular progress indicator */}
                      <div className="flex items-center justify-center mb-10">
                        <div className="relative">
                          {/* Outer glow */}
                          <motion.div
                            className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-accent/40 via-purple-500/40 to-blue-500/40 blur-2xl"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />

                          <div className="relative w-56 h-56">
                            {/* SVG Circle */}
                            <svg className="w-full h-full -rotate-90">
                              {/* Background circle */}
                              <circle
                                cx="112"
                                cy="112"
                                r="100"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="10"
                                fill="none"
                              />
                              {/* Progress circle with gradient */}
                              <motion.circle
                                cx="112"
                                cy="112"
                                r="100"
                                stroke="url(#progressGradient)"
                                strokeWidth="10"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 100}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - progress / 100) }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                style={{
                                  filter: "drop-shadow(0 0 8px rgba(91, 91, 214, 0.5))",
                                }}
                              />
                              <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#5B5BD6" />
                                  <stop offset="50%" stopColor="#7B7BF6" />
                                  <stop offset="100%" stopColor="#60A5FA" />
                                </linearGradient>
                              </defs>
                            </svg>

                            {/* Progress percentage in center */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <motion.span
                                className="text-6xl font-bold text-white"
                                key={Math.floor(progress)}
                                initial={{ scale: 1 }}
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 0.3 }}
                              >
                                {Math.floor(progress)}
                              </motion.span>
                              <span className="text-gray-400 text-sm mt-1">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scanning steps - Scrollable */}
                      <div className="relative mb-6">
                        <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {scanningSteps.map((step, index) => {
                          const isCompleted = completedSteps.includes(step.id);
                          const isCurrent = currentStep === index;
                          const isUpcoming = index > currentStep;
                          const StepIcon = step.icon;

                          return (
                            <motion.div
                              key={step.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ 
                                opacity: isUpcoming ? 0.4 : 1, 
                                x: 0 
                              }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                                isCurrent 
                                  ? "bg-gradient-to-r from-accent/20 via-purple-500/20 to-transparent border border-accent/30 shadow-sm" 
                                  : isCompleted
                                  ? "bg-white/5"
                                  : "bg-transparent"
                              }`}
                              style={
                                isCurrent
                                  ? {
                                      boxShadow: "0 0 20px rgba(91, 91, 214, 0.2)",
                                    }
                                  : {}
                              }
                            >
                              {/* Icon */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                isCompleted 
                                  ? "bg-gradient-to-br from-green-400 to-emerald-500"
                                  : isCurrent
                                  ? "bg-gradient-to-br from-accent to-purple-600"
                                  : "bg-white/5"
                              }`}>
                                {isCompleted ? (
                                  <Check className="h-5 w-5 text-white" />
                                ) : isCurrent ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Loader2 className="h-5 w-5 text-white" />
                                  </motion.div>
                                ) : (
                                  <StepIcon className="h-5 w-5 text-gray-500" />
                                )}
                              </div>

                              {/* Step message */}
                              <span
                                className={`text-sm flex-1 ${
                                  isCurrent
                                    ? "text-white font-semibold"
                                    : isCompleted
                                    ? "text-gray-300"
                                    : "text-gray-500"
                                }`}
                              >
                                {step.message}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                      </div>

                      {/* Stop scan link */}
                      <div className="text-center pt-4 border-t border-white/10">
                        <Button
                          variant="link"
                          onClick={() => setShowStopDialog(true)}
                          className="text-sm text-gray-400 hover:text-gray-300 transition-colors underline underline-offset-4 h-auto p-0"
                        >
                          Stop Scan
                        </Button>
                      </div>
                    </motion.div>
                  {false && (
                    <motion.div
                      key="report"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="py-4"
                    >
                      {/* Close button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="absolute top-6 right-6 text-gray-400 hover:text-gray-300 transition-colors h-auto p-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>

                      <div className="text-center space-y-8">
                        {/* Success indicator */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", duration: 0.6 }}
                          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mx-auto"
                        >
                          <Check className="h-8 w-8 text-white" />
                        </motion.div>

                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">
                            Analysis Complete
                          </h2>
                          <p className="text-gray-400">
                            Your AI Readiness Report is ready
                          </p>
                        </div>

                        {/* Final AI Score */}
                        <div className="bg-gradient-to-br from-accent/10 via-purple-500/10 to-blue-500/10 border border-accent/20 rounded-2xl p-8">
                          <div className="space-y-6">
                            <div>
                              <div className="text-sm text-gray-400 mb-2">
                                AI READINESS SCORE
                              </div>
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="text-7xl font-bold bg-gradient-to-br from-accent via-purple-600 to-blue-600 bg-clip-text text-transparent"
                              >
                                72
                              </motion.div>
                              <div className="text-sm text-gray-400 mt-1">/100</div>
                            </div>

                            {/* Category breakdown summary */}
                            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-1"
                              >
                                <div className="text-xs text-gray-400">SEO Foundation</div>
                                <div className="text-2xl font-bold text-white">84</div>
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-1"
                              >
                                <div className="text-xs text-gray-400">AI Readiness</div>
                                <div className="text-2xl font-bold text-white">68</div>
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-1"
                              >
                                <div className="text-xs text-gray-400">UX Clarity</div>
                                <div className="text-2xl font-bold text-white">71</div>
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        {/* What This Means Section */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="text-left bg-white/5 border border-white/10 rounded-xl p-6 space-y-3"
                        >
                          <h3 className="text-base font-semibold text-white mb-4">
                            What This Means
                          </h3>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            Your site performs well on traditional SEO fundamentals.
                          </p>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            However, it lacks structural optimization for AI search engines and LLM visibility.
                          </p>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            AI discoverability will increasingly impact future digital growth and user acquisition.
                          </p>
                        </motion.div>

                        {/* CTA Section */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="space-y-4"
                        >
                          {/* Primary CTA */}
                          <Button
                            onClick={() => {
                              // Placeholder for conversion action
                              console.log("Make My Website AI-Ready clicked");
                            }}
                            className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-medium"
                          >
                            Make My Website AI-Ready
                          </Button>
                          
                          {/* Improvement potential */}
                          <p className="text-xs text-gray-500">
                            Estimated AI visibility improvement potential: +18–32%
                          </p>

                          {/* Secondary link */}
                          <Button
                            variant="link"
                            onClick={handleDownloadReport}
                            className="text-sm text-gray-400 hover:text-gray-300 transition-colors underline underline-offset-4 h-auto p-0"
                          >
                            Download Detailed Report (PDF)
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stop Scan Confirmation Dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interrupt Scan?</AlertDialogTitle>
            <AlertDialogDescription>
              Your AI analysis is still in progress. Are you sure you want to stop it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowStopDialog(false)}>
              Continue Scanning
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStopScan} className="bg-gray-600 hover:bg-gray-700">
              Stop & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
