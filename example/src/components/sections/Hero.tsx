import { ArrowRight, Clock, Users, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="section bg-gradient-to-b from-tempo-100 to-tempo-50">
      <div className="container-wide">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-tempo-200 mb-8">
            <span className="w-2 h-2 bg-status-progress animate-pulse" />
            <span className="text-sm font-medium text-tempo-600">
              See what we're building
            </span>
          </div>

          <h1 className="heading-xl mb-6">
            Async collaboration
            <br />
            <span className="text-tempo-500">for remote teams</span>
          </h1>

          <p className="text-xl text-tempo-600 mb-10 max-w-2xl mx-auto">
            Tempo helps distributed teams work together without the chaos of
            constant meetings. Document decisions, share updates, and move
            projects forward—on your own time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="#roadmap" className="btn btn-primary px-6 py-3 text-base">
              View Roadmap
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
            <a href="#changelog" className="btn btn-secondary px-6 py-3 text-base">
              Latest Updates
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="card text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-status-feature/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="heading-sm mb-2">Async-First</h3>
            <p className="text-muted">
              No more timezone coordination. Work when you're most productive.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-status-progress/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="heading-sm mb-2">Team Aligned</h3>
            <p className="text-muted">
              Everyone stays informed without information overload.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-status-completed/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="heading-sm mb-2">Ship Faster</h3>
            <p className="text-muted">
              Unblock decisions and keep projects moving forward.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
