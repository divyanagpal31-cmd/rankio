import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Brain, Check, Database, FileText, Globe, Grid3x3, Loader2, Lock, Search } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
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
  { id: 1, message: "Discovering website pages...", duration: 2000, icon: Globe },
  { id: 2, message: "Checking technical SEO signals...", duration: 2500, icon: Search },
  { id: 3, message: "Analyzing structured data...", duration: 3000, icon: Database },
  { id: 4, message: "Reviewing content clarity and structure...", duration: 2500, icon: FileText },
  { id: 5, message: "Evaluating AI visibility signals...", duration: 2000, icon: Brain },
  { id: 6, message: "Calculating your website scores...", duration: 2500, icon: Grid3x3 },
  { id: 7, message: "Preparing your personalized report...", duration: 2000, icon: FileText },
];

const scanProgressThresholds = [5, 10, 20, 35, 45, 75, 100];
const stepTransition = { duration: 0.45, ease: "easeOut" } as const;

function deriveStepState(progress: number) {
  if (progress >= 100) {
    return {
      currentStep: scanningSteps.length - 1,
      completedSteps: scanningSteps.map((step) => step.id),
    };
  }

  const currentStep = scanProgressThresholds.findIndex((threshold) => progress <= threshold);
  const safeCurrentStep = currentStep === -1 ? scanningSteps.length - 1 : currentStep;

  return {
    currentStep: safeCurrentStep,
    completedSteps: scanningSteps.slice(0, safeCurrentStep).map((step) => step.id),
  };
}

interface ScanningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteUrl: string;
  isComplete?: boolean;
  onStopScan?: () => void;
}

export function ScanningModal({ open, onOpenChange, websiteUrl, isComplete = false, onStopScan }: ScanningModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [exitWarningOpen, setExitWarningOpen] = useState(false);
  const stepsContainerRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setCurrentStep(0);
      setCompletedSteps([]);
      setExitWarningOpen(false);
      return;
    }

    if (isComplete) {
      return;
    }

    const totalDuration = scanningSteps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;
    let lastStep = -1;
    const completed = new Set<number>();

    const interval = window.setInterval(() => {
      elapsed += 50;

      const rawProgress = (elapsed / totalDuration) * 100;
      const displayProgress = Math.min(rawProgress, 92);
      setProgress(displayProgress);

      let accumulatedTime = 0;
      let currentStepIndex = scanningSteps.length - 1;

      for (let index = 0; index < scanningSteps.length; index++) {
        accumulatedTime += scanningSteps[index].duration;
        if (elapsed < accumulatedTime) {
          currentStepIndex = index;
          break;
        }
        if (index < scanningSteps.length - 1) {
          completed.add(scanningSteps[index].id);
        }
      }

      if (currentStepIndex !== lastStep) {
        lastStep = currentStepIndex;
        setCurrentStep(currentStepIndex);
        setCompletedSteps(Array.from(completed));
      }

      if (elapsed >= totalDuration) {
        window.clearInterval(interval);
        setProgress(92);
        setCurrentStep(scanningSteps.length - 1);
        setCompletedSteps(scanningSteps.slice(0, -1).map((step) => step.id));
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [open, isComplete]);

  useEffect(() => {
    if (!open || !isComplete) return;

    setProgress((current) => Math.max(Math.floor(current), 92));
    setCurrentStep(scanningSteps.length - 1);
    setCompletedSteps(scanningSteps.map((step) => step.id));

    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(Math.floor(current) + 1, 100);
        if (next >= 100) {
          window.clearInterval(interval);
        }
        return next;
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [isComplete, open]);

  useEffect(() => {
    if (!open) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "A scan is currently in progress. Are you sure you want to close this browser window? The scan may stop.";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleMouseOut = (event: MouseEvent) => {
      const isLeavingWindow = !event.relatedTarget && event.clientY <= 8;
      if (isLeavingWindow) setExitWarningOpen(true);
    };

    document.addEventListener("mouseout", handleMouseOut);
    return () => document.removeEventListener("mouseout", handleMouseOut);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const currentStepId = scanningSteps[currentStep]?.id;
    if (!currentStepId) return;
    const container = stepsContainerRef.current;
    const currentStepElement = stepRefs.current[currentStepId];
    if (!container || !currentStepElement) return;

    window.requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const stepRect = currentStepElement.getBoundingClientRect();
      const targetTop =
        container.scrollTop +
        stepRect.top -
        containerRect.top -
        (container.clientHeight - currentStepElement.clientHeight) / 2;

      container.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });
    });
  }, [currentStep, open]);

  const progressValue = Math.floor(progress);
  const circleSize = 2 * Math.PI * 88;
  const activeStep = scanningSteps[currentStep] ?? scanningSteps[0];
  const ActiveStepIcon = activeStep.icon;
  const handleStopScan = () => {
    setExitWarningOpen(false);
    onStopScan?.();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) onOpenChange(true);
        }}
      >
        <DialogContent
          className="!flex h-[min(820px,calc(100dvh-2rem))] !w-[min(800px,calc(100vw-2rem))] !max-w-none overflow-hidden border border-white/10 bg-gradient-to-br from-[#0A0F1E] via-[#0F172A] to-[#1a1f3a] p-0 text-white shadow-2xl"
          hideCloseButton
          aria-describedby="scanning-description"
        >
          <span id="scanning-description" className="sr-only">
            AI website scanning and analysis in progress.
          </span>

        <div className="relative flex min-h-0 w-full flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(123,123,246,0.28),transparent_42%)]" />

          <div className="relative flex min-h-0 flex-1 flex-col p-5 sm:p-7">
            <div className="shrink-0 pr-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a9a7ff]">AI Visibility Analysis</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Preparing Your Website Report</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/68">
                We're analyzing your website and preparing your personalized insights. Your report will open automatically when it's ready.
              </p>
            </div>

            <div className="mx-auto mt-5 flex w-full max-w-xl shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Lock className="h-4 w-4 shrink-0 text-white/45" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Website being analyzed</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{websiteUrl}</p>
              </div>
            </div>

            <div className="mt-6 grid min-h-0 flex-1 gap-8 md:grid-cols-[300px_minmax(420px,1fr)] md:items-center">
              <div className="flex shrink-0 flex-col items-center gap-4">
                <div className="relative h-48 w-48">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-accent/25 blur-2xl"
                    animate={{ scale: [1, 1.14, 1], opacity: [0.4, 0.75, 0.4] }}
                    transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <svg className="relative h-full w-full -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="88"
                      fill="none"
                      stroke="url(#scanProgressGradient)"
                      strokeLinecap="round"
                      strokeWidth="10"
                      strokeDasharray={circleSize}
                      animate={{ strokeDashoffset: circleSize * (1 - progress / 100) }}
                      transition={{ duration: 0.65, ease: "easeInOut" }}
                    />
                    <defs>
                      <linearGradient id="scanProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--accent))" />
                        <stop offset="100%" stopColor="#60A5FA" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      key={progressValue}
                      initial={{ opacity: 0.65, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="text-5xl font-bold text-white"
                    >
                      {progressValue}
                    </motion.span>
                    <span className="mt-1 text-xs text-white/45">% complete</span>
                  </div>
                </div>

                <div className="w-full max-w-[280px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep.id}
                      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                      transition={{ duration: 0.32, ease: "easeOut" }}
                      className="flex items-center justify-center gap-2 text-xs font-semibold text-white/80"
                    >
                      <ActiveStepIcon className="h-4 w-4 text-[#a9a7ff]" />
                      <span>{activeStep.message.replace("...", "")}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-center text-xs leading-5 text-amber-100">
                  {progress >= 100
                    ? "Almost there! We're putting the final insights together."
                    : "Analysis time may vary depending on website size and accessibility."}
                </div>
              </div>

              <div
                ref={stepsContainerRef}
                className="min-h-[172px] min-w-0 space-y-3 overflow-x-hidden overflow-y-scroll overscroll-contain pr-2 [scrollbar-gutter:stable] md:h-full"
                style={{ maxHeight: "min(50dvh, 430px)" }}
                aria-label="Scanning progress steps"
              >
                {scanningSteps.map((step, index) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = currentStep === index;
                  const StepIcon = step.icon;

                  return (
                    <motion.div
                      key={step.id}
                      ref={(element) => {
                        stepRefs.current[step.id] = element;
                      }}
                      layout
                      animate={{
                        opacity: isCurrent ? 1 : isCompleted ? 0.86 : 0.62,
                        scale: isCurrent ? 1.015 : 1,
                      }}
                      transition={stepTransition}
                      className={`flex min-w-0 items-center gap-4 rounded-xl px-4 py-3 transition-[background,border-color,box-shadow] duration-500 ease-out ${
                        isCurrent
                          ? "border border-accent/30 bg-gradient-to-r from-accent/25 via-purple-500/20 to-transparent shadow-[0_0_22px_rgba(91,91,214,0.18)]"
                          : isCompleted
                            ? "border border-white/10 bg-white/6"
                            : "border border-transparent bg-white/[0.025]"
                      }`}
                    >
                      <motion.div
                        layout
                        animate={{ scale: isCurrent ? 1.08 : 1 }}
                        transition={stepTransition}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-500 ${
                          isCompleted
                            ? "bg-gradient-to-br from-green-400 to-emerald-500"
                            : isCurrent
                              ? "bg-gradient-to-br from-accent to-purple-600"
                              : "bg-white/5"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : isCurrent ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}>
                            <Loader2 className="h-5 w-5 text-white" />
                          </motion.div>
                        ) : (
                          <StepIcon className="h-5 w-5 text-white/35" />
                        )}
                      </motion.div>

                      <motion.span
                        layout
                        animate={{ x: isCurrent ? 2 : 0 }}
                        transition={stepTransition}
                        className={`min-w-0 flex-1 whitespace-normal break-words text-sm leading-5 transition-colors duration-500 ${
                          isCurrent ? "font-semibold text-white" : isCompleted ? "text-white/78" : "text-white/42"
                        }`}
                      >
                        {step.message}
                      </motion.span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={exitWarningOpen} onOpenChange={setExitWarningOpen}>
        <AlertDialogContent className="border border-amber-200 bg-white">
          <AlertDialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <AlertDialogTitle>Scan is still in progress</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Please don&apos;t close or refresh this browser tab yet. Your scan is currently running, and closing the browser may stop the scan before your report is ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleStopScan}
            >
              Stop scan
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setExitWarningOpen(false)}>
              Continue Scan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
