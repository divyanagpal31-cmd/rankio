export function TrustSection() {
  return (
    <section className="py-16 bg-white border-y border-border/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-8">
          <p className="text-sm text-muted-foreground" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
            TRUSTED BY LEADING TEAMS
          </p>
          
          {/* Placeholder company logos */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-40">
            <div className="h-8 w-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            <div className="h-8 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            <div className="h-8 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            <div className="h-8 w-36 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            <div className="h-8 w-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8">
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl text-primary" style={{ fontWeight: 700 }}>
                10K+
              </div>
              <div className="text-sm text-muted-foreground">
                Websites Analyzed
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl text-primary" style={{ fontWeight: 700 }}>
                98%
              </div>
              <div className="text-sm text-muted-foreground">
                Accuracy Rate
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl md:text-4xl text-primary" style={{ fontWeight: 700 }}>
                24/7
              </div>
              <div className="text-sm text-muted-foreground">
                Monitoring
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
