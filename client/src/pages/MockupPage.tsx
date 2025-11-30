export default function MockupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Support Board Redesign</h1>
          <p className="text-xl text-slate-300">"Conversation-First Intelligence"</p>
          <p className="text-slate-400 mt-2">A complete visual and UX overhaul</p>
        </div>

        {/* Color Palette */}
        <div className="mb-16 bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-8">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="h-24 rounded-lg bg-indigo-600"></div>
              <p className="text-sm text-slate-300">Primary Indigo</p>
              <p className="text-xs text-slate-400">#4F46E5</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-lg bg-emerald-600"></div>
              <p className="text-sm text-slate-300">Success Emerald</p>
              <p className="text-xs text-slate-400">#059669</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-lg bg-amber-500"></div>
              <p className="text-sm text-slate-300">AI Accent Amber</p>
              <p className="text-xs text-slate-400">#F59E0B</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-lg bg-slate-900"></div>
              <p className="text-sm text-slate-300">Neutral Slate</p>
              <p className="text-xs text-slate-400">#1E293B</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-lg bg-slate-200"></div>
              <p className="text-sm text-slate-300">Light Surface</p>
              <p className="text-xs text-slate-400">#F1F5F9</p>
            </div>
          </div>
        </div>

        {/* Customer Chat Redesign */}
        <div className="mb-16 bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-8">Customer Chat - New Design</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Empty State */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Empty State</h3>
              <div className="bg-white rounded-lg h-80 flex flex-col items-center justify-center p-6 space-y-6">
                <div className="text-4xl">✨</div>
                <h3 className="text-2xl font-bold text-slate-900">How can we help?</h3>
                <input 
                  type="text" 
                  placeholder="Search or ask anything..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled
                />
                <div className="flex gap-2 justify-center flex-wrap">
                  <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">💳 Billing</div>
                  <div className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">🛠️ Tech</div>
                  <div className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium">📊 Sales</div>
                </div>
              </div>
            </div>

            {/* Active Conversation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Active Conversation</h3>
              <div className="bg-white rounded-lg h-80 flex flex-col overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600"></div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Support Team</p>
                      <p className="text-xs text-slate-500">2 min</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-slate-400 hover:text-slate-600">↺</button>
                    <button className="text-slate-400 hover:text-slate-600">−</button>
                    <button className="text-slate-400 hover:text-slate-600">×</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-300 flex-shrink-0"></div>
                    <div className="bg-slate-100 rounded-lg p-3 text-sm text-slate-900">
                      How can I help with your billing today?
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="bg-indigo-600 text-white rounded-lg p-3 text-sm max-w-xs">
                      I need to change my plan
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-300 flex-shrink-0"></div>
                    <div className="bg-slate-100 rounded-lg p-3 text-sm text-slate-900 space-y-1">
                      <p>I can help with that! Let me check your options.</p>
                      <p className="text-xs text-amber-600">✓ AI-Powered • 92% confidence</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex gap-2">
                    <button className="text-slate-600 hover:text-slate-900">📎</button>
                    <input 
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled
                    />
                    <button className="text-slate-600 hover:text-slate-900">🎤</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Dashboard */}
        <div className="mb-16 bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-8">Admin Dashboard - New Layout</h2>
          
          <div className="bg-white rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="text-white">≡</button>
                <h1 className="text-white font-bold">Support Board</h1>
              </div>
              <div className="flex gap-4 text-white">
                <button>🔔</button>
                <button>👤</button>
                <button>⚙️</button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-12 gap-0">
              {/* Sidebar */}
              <div className="col-span-3 bg-slate-50 border-r border-slate-200 p-4 space-y-2">
                <div className="px-4 py-2 rounded bg-indigo-100 text-indigo-700 font-medium text-sm">Dashboard</div>
                <div className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer text-sm">Conversations</div>
                <div className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer text-sm">Queue</div>
                <div className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer text-sm">Knowledge Base</div>
                <div className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer text-sm">Categories</div>
                <div className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer text-sm">AI Config</div>
                <div className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded cursor-pointer text-sm">Analytics</div>
              </div>

              {/* Main Area */}
              <div className="col-span-9 p-6 space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
                
                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Active Conversations', value: '12', color: 'indigo' },
                    { label: 'Avg Response Time', value: '2.3m', color: 'emerald' },
                    { label: 'Customer Satisfaction', value: '4.6/5', color: 'amber' },
                    { label: 'AI Accuracy', value: '94%', color: 'blue' },
                  ].map((metric, i) => (
                    <div key={i} className={`bg-${metric.color}-50 rounded-lg p-4 border border-${metric.color}-200`}>
                      <p className={`text-${metric.color}-700 text-sm font-medium`}>{metric.label}</p>
                      <p className={`text-${metric.color}-900 text-2xl font-bold`}>{metric.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5"></div>
                      <p className="text-slate-700">New conversation (Billing) from Sarah Chen</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5"></div>
                      <p className="text-slate-700">John assigned to ticket #234</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-600 mt-1.5"></div>
                      <p className="text-slate-700">AI identified knowledge gap in Technical category</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-8">Key UX Improvements</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Context Stack', desc: 'Progressive disclosure: Empty → Category → Info → Chat. Can jump back anytime.' },
              { title: 'Unified Search', desc: 'Global search across conversations, knowledge base, and team. Quick context jump.' },
              { title: 'Activity Timeline', desc: 'System messages integrated naturally with clear agent/AI/customer attribution.' },
              { title: 'Smart AI Indicators', desc: 'Subtle confidence badges on AI messages with source materials and clear handoffs.' },
              { title: 'Micro-Interactions', desc: 'Smooth transitions, optimistic updates, and subtle success/error feedback.' },
              { title: 'Guided Flows', desc: 'Never overwhelm the customer. Progressive disclosure at every step.' },
            ].map((feature, i) => (
              <div key={i} className="border border-slate-600 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-300 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-300 mb-4">Ready to implement this redesign?</p>
          <a 
            href="/" 
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
          >
            View Current App
          </a>
        </div>
      </div>
    </div>
  );
}
