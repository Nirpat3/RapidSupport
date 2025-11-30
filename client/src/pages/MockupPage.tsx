import { useState } from "react";
import { ChevronRight } from "lucide-react";

export default function MockupPage() {
  const [activeTab, setActiveTab] = useState("home");

  const tabs = [
    { id: "home", label: "Overview" },
    { id: "customer-chat", label: "Customer Chat" },
    { id: "dashboard", label: "Admin Dashboard" },
    { id: "conversations", label: "Conversations" },
    { id: "categories", label: "Categories" },
    { id: "ai-config", label: "AI Configuration" },
    { id: "knowledge-base", label: "Knowledge Base" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-slate-900/95 border-b border-slate-700 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* HOME/OVERVIEW TAB */}
        {activeTab === "home" && (
          <div className="space-y-16">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-white mb-4">Support Board Redesign</h1>
              <p className="text-xl text-slate-300">"Conversation-First Intelligence"</p>
              <p className="text-slate-400 mt-2">A complete visual and UX overhaul</p>
            </div>

            {/* Color Palette */}
            <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-8">Color Palette</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { color: "bg-indigo-600", name: "Primary Indigo", hex: "#4F46E5" },
                  { color: "bg-emerald-600", name: "Success Emerald", hex: "#059669" },
                  { color: "bg-amber-500", name: "AI Accent Amber", hex: "#F59E0B" },
                  { color: "bg-slate-900", name: "Neutral Slate", hex: "#1E293B" },
                  { color: "bg-slate-200", name: "Light Surface", hex: "#F1F5F9" },
                ].map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className={`h-24 rounded-lg ${item.color}`}></div>
                    <p className="text-sm text-slate-300">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.hex}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pages Overview */}
            <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-8">Pages Overview</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {tabs.slice(1).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-indigo-500 hover:bg-slate-700 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">{tab.label}</h3>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Features */}
            <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-8">Key UX Improvements</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "Context Stack", desc: "Progressive disclosure: Empty → Category → Info → Chat. Can jump back anytime." },
                  { title: "Unified Search", desc: "Global search across conversations, knowledge base, and team. Quick context jump." },
                  { title: "Activity Timeline", desc: "System messages integrated naturally with clear agent/AI/customer attribution." },
                  { title: "Smart AI Indicators", desc: "Subtle confidence badges on AI messages with source materials and clear handoffs." },
                  { title: "Micro-Interactions", desc: "Smooth transitions, optimistic updates, and subtle success/error feedback." },
                  { title: "Guided Flows", desc: "Never overwhelm the customer. Progressive disclosure at every step." },
                ].map((feature) => (
                  <div key={feature.title} className="border border-slate-600 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-300 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER CHAT TAB */}
        {activeTab === "customer-chat" && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">Customer Chat - New Design</h1>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Empty State */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Empty State - Category Selection</h3>
                <div className="bg-white rounded-lg h-96 flex flex-col items-center justify-center p-6 space-y-6">
                  <div className="text-6xl font-light">✨</div>
                  <h2 className="text-2xl font-bold text-slate-900">How can we help?</h2>
                  <input type="text" placeholder="Search or ask anything..." className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled />
                  <div className="flex gap-2 justify-center flex-wrap w-full">
                    {[{ label: "Billing", color: "blue" }, { label: "Technical", color: "orange" }, { label: "Sales", color: "green" }].map((cat) => (
                      <div key={cat.label} className={`px-4 py-2 rounded-full bg-${cat.color}-100 text-${cat.color}-700 text-sm font-medium cursor-pointer hover:bg-${cat.color}-200`}>
                        {cat.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Conversation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Active Conversation with AI</h3>
                <div className="bg-white rounded-lg h-96 flex flex-col overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20"></div>
                      <div>
                        <p className="font-semibold text-white text-sm">Support Team</p>
                        <p className="text-xs text-indigo-200">2 min response</p>
                      </div>
                    </div>
                    <div className="text-white text-lg">×</div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-200 flex-shrink-0"></div>
                      <div className="bg-slate-200 rounded-lg p-3 text-sm text-slate-900 max-w-xs">How can I help with your billing today?</div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <div className="bg-indigo-600 text-white rounded-lg p-3 text-sm max-w-xs">I need to change my plan</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex-shrink-0"></div>
                      <div className="space-y-1">
                        <div className="bg-amber-50 rounded-lg p-3 text-sm text-slate-900 border border-amber-200">
                          <p className="mb-2">I can help with that! Let me check your available plans.</p>
                          <p className="text-xs text-amber-700 font-medium">✓ AI-Powered • 92% confidence</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-slate-600">📎</button>
                      <input type="text" placeholder="Type your message..." className="flex-1 px-3 py-2 rounded border border-slate-300 text-sm" disabled />
                      <button className="text-slate-600">→</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-white font-semibold mb-4">Key Features</h3>
              <ul className="text-slate-300 space-y-2 text-sm">
                <li>✓ Category selection upfront for smart routing</li>
                <li>✓ Progressive info gathering before chat starts</li>
                <li>✓ AI confidence badges on all responses</li>
                <li>✓ Suggested questions based on category</li>
                <li>✓ Smooth transitions between states</li>
                <li>✓ Rich media support (attachments, camera, voice)</li>
              </ul>
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>

            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Dashboard</h2>
                <div className="flex gap-4 text-white">
                  <button className="hover:bg-indigo-500 px-3 py-1 rounded">🔔</button>
                  <button className="hover:bg-indigo-500 px-3 py-1 rounded">⚙️</button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4 p-6 bg-slate-50">
                {[
                  { label: "Active Conversations", value: "12", color: "indigo" },
                  { label: "Avg Response Time", value: "2.3m", color: "emerald" },
                  { label: "Customer Satisfaction", value: "4.6/5", color: "amber" },
                  { label: "AI Accuracy", value: "94%", color: "blue" },
                ].map((metric) => (
                  <div key={metric.label} className={`bg-${metric.color}-50 rounded-lg p-4 border border-${metric.color}-200`}>
                    <p className={`text-${metric.color}-700 text-sm font-medium`}>{metric.label}</p>
                    <p className={`text-${metric.color}-900 text-2xl font-bold mt-2`}>{metric.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="p-6 border-t border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    { icon: "🔵", text: "New conversation (Billing) from Sarah Chen" },
                    { icon: "🟢", text: "John assigned to ticket #234" },
                    { icon: "🟡", text: "AI identified knowledge gap in Technical" },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="text-lg mt-1">{activity.icon}</div>
                      <p className="text-slate-700 text-sm">{activity.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONVERSATIONS TAB */}
        {activeTab === "conversations" && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">Conversations Management</h1>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Conversation List */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Search conversations..." className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" disabled />
                    <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm" disabled>
                      <option>All Status</option>
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-slate-200">
                  {[
                    { name: "Sarah Chen", category: "Billing", status: "open", time: "2 min ago", unread: true },
                    { name: "John Smith", category: "Technical", status: "in_progress", time: "15 min ago", unread: false },
                    { name: "Emma Wilson", category: "Sales", status: "resolved", time: "1 hour ago", unread: false },
                  ].map((conv) => (
                    <div key={conv.name} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-indigo-600">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{conv.name}</p>
                          <p className="text-sm text-slate-500">{conv.category}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          conv.status === "open" ? "bg-blue-100 text-blue-700" :
                          conv.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {conv.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{conv.time}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversation Details */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">Assign to Agent</button>
                  <button className="w-full px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium">Change Status</button>
                  <button className="w-full px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium">Add Note</button>
                  <button className="w-full px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium">Escalate to Manager</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === "categories" && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">Support Categories Management</h1>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold">Categories</h2>
                <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">+ New Category</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 p-6">
                {[
                  { name: "Billing", icon: "💳", color: "blue", assigned: "Billing Specialist", visibility: "visible" },
                  { name: "Technical Support", icon: "🛠️", color: "orange", assigned: "Technical Support Specialist", visibility: "visible" },
                  { name: "Sales", icon: "📊", color: "green", assigned: "Sales Assistant", visibility: "visible" },
                  { name: "General", icon: "❓", color: "purple", assigned: "General Support Assistant", visibility: "hidden" },
                ].map((cat) => (
                  <div key={cat.name} className={`p-4 border-2 border-${cat.color}-200 bg-${cat.color}-50 rounded-lg`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{cat.icon}</div>
                        <div>
                          <p className="font-semibold text-slate-900">{cat.name}</p>
                          <p className="text-xs text-slate-600">AI: {cat.assigned}</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600">⋯</button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-1 rounded-full ${cat.visibility === "visible" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                        {cat.visibility}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI CONFIGURATION TAB */}
        {activeTab === "ai-config" && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">AI Configuration Hub</h1>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Create AI Agent", desc: "Configure a new AI agent with custom prompts and behaviors", icon: "🤖" },
                { title: "Performance Metrics", desc: "Monitor AI accuracy, response quality, and user satisfaction", icon: "📊" },
                { title: "Learning Queue", desc: "Review and approve AI improvements from human feedback", icon: "📚" },
              ].map((item) => (
                <div key={item.title} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-indigo-500 transition-colors cursor-pointer">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-300 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-slate-900 mb-4">Active AI Agents</h3>
              <div className="space-y-4">
                {[
                  { name: "Billing Specialist", model: "GPT-4o-mini", accuracy: "94%", conversations: 234 },
                  { name: "Technical Support", model: "GPT-4o-mini", accuracy: "91%", conversations: 456 },
                  { name: "Sales Assistant", model: "GPT-4o-mini", accuracy: "89%", conversations: 123 },
                ].map((agent) => (
                  <div key={agent.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-600">{agent.model}</p>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-slate-600">Accuracy</p>
                        <p className="font-bold text-emerald-600">{agent.accuracy}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Conversations</p>
                        <p className="font-bold text-indigo-600">{agent.conversations}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE BASE TAB */}
        {activeTab === "knowledge-base" && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">Knowledge Base</h1>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <input type="text" placeholder="Search articles..." className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64" disabled />
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">+ New Article</button>
              </div>

              <div className="divide-y divide-slate-200">
                {[
                  { title: "How to update your billing info", category: "Billing", views: 234, popular: true },
                  { title: "Troubleshooting common errors", category: "Technical", views: 456, popular: true },
                  { title: "Getting started with our API", category: "Technical", views: 89, popular: false },
                  { title: "Team management best practices", category: "Admin", views: 45, popular: false },
                ].map((article) => (
                  <div key={article.title} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900">{article.title}</p>
                          {article.popular && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Popular</span>}
                        </div>
                        <p className="text-xs text-slate-600">{article.category}</p>
                      </div>
                      <p className="text-sm text-slate-500">{article.views} views</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">Settings & Configuration</h1>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: "Company Profile", desc: "Update company name, logo, and brand settings", icon: "🏢" },
                { title: "Team Members", desc: "Manage staff, permissions, and roles", icon: "👥" },
                { title: "Integrations", desc: "Connect third-party tools and services", icon: "🔗" },
                { title: "API Keys", desc: "Generate and manage API credentials", icon: "🔑" },
                { title: "Notifications", desc: "Configure alerts and email preferences", icon: "🔔" },
                { title: "Advanced Settings", desc: "Custom configurations and webhooks", icon: "⚙️" },
              ].map((setting) => (
                <div key={setting.title} className="bg-white rounded-lg p-6 border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{setting.icon}</div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{setting.title}</h3>
                  <p className="text-sm text-slate-600">{setting.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-slate-400 text-sm border-t border-slate-700 mt-16">
        <p>Click on any page tab above to view the mockup. Navigate through all sections to explore the complete redesign.</p>
      </div>
    </div>
  );
}
