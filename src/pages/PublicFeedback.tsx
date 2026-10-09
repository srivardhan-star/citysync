// ============================================================
// CivicTrack — Public Feedback & Accountability Page
// ============================================================

import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Star,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  MapPin,
  Calendar,
  User,
  ThumbsUp,
  BarChart3,
  TrendingUp,
  Layers,
  Send,
  Navigation,
  Shield,
  HelpCircle,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { useApp } from '../context/AppContext';
import {
  calculateDelay,
  formatDate,
  formatDateTime,
  generateId,
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
} from '../utils';
import type { Review, Project, IssueReport, IssueCategory, IssueReportStatus } from '../types';

export default function PublicFeedback() {
  const {
    state,
    addReview,
    addIssueReport,
    updateIssueReportStatus,
    isGovernment,
    isPublic,
  } = useApp();
  const { projects, reviews, issueReports } = state;

  // Tab state between Reviews and Issue Reports
  const [feedbackTab, setFeedbackTab] = useState<'reviews' | 'issues'>('reviews');

  // Search & Filter state for Public Browser
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Review Form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Issue Report Form state
  const [issueProjectId, setIssueProjectId] = useState<string>('');
  const [issueCategory, setIssueCategory] = useState<IssueCategory>('safety_hazard');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueLocation, setIssueLocation] = useState('');
  const [issueReporter, setIssueReporter] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [issueStatusFilter, setIssueStatusFilter] = useState<'all' | 'open' | 'under_review' | 'resolved'>('all');

  // Completed projects available for review
  const completedProjects = useMemo(() => {
    return projects.filter((p) => p.status === 'completed');
  }, [projects]);

  // Set default selected completed project if none selected
  useMemo(() => {
    if (!selectedProjectId && completedProjects.length > 0) {
      setSelectedProjectId(completedProjects[0].id);
    }
  }, [completedProjects, selectedProjectId]);

  // Filtered projects for public browser
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterType === 'active' && p.status === 'completed') return false;
      if (filterType === 'completed' && p.status !== 'completed') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q)
      );
    });
  }, [projects, filterType, searchQuery]);

  // Accountability & Performance Metrics
  const metrics = useMemo(() => {
    const completedWithDates = projects.filter(
      (p) => p.status === 'completed' && p.actualEndDate && p.plannedEndDate
    );

    let onTimeCount = 0;
    let lateCount = 0;
    let totalDelayDays = 0;

    completedWithDates.forEach((p) => {
      const delay = calculateDelay(p);
      if (delay.isDelayed && delay.delayDays > 0) {
        lateCount++;
        totalDelayDays += delay.delayDays;
      } else {
        onTimeCount++;
      }
    });

    const avgDelay = lateCount > 0 ? Math.round(totalDelayDays / lateCount) : 0;
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    return {
      completedCount: completedProjects.length,
      onTimeCount,
      lateCount,
      avgDelay,
      avgRating,
      totalReviews: reviews.length,
    };
  }, [projects, completedProjects, reviews]);

  // Rating breakdown distribution
  const ratingDistribution = useMemo(() => {
    const dist = [
      { star: '5 Stars', count: 0 },
      { star: '4 Stars', count: 0 },
      { star: '3 Stars', count: 0 },
      { star: '2 Stars', count: 0 },
      { star: '1 Star', count: 0 },
    ];
    reviews.forEach((r) => {
      const idx = 5 - r.rating;
      if (dist[idx]) dist[idx].count++;
    });
    return dist;
  }, [reviews]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProjectId) {
      setFormError('Please select a completed project to review.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setFormError('Please select a rating between 1 and 5 stars.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      setFormError('Please write a constructive comment (at least 10 characters).');
      return;
    }

    const newReview: Review = {
      id: generateId('rev'),
      projectId: selectedProjectId,
      rating,
      comment: comment.trim(),
      submittedAt: new Date().toISOString(),
      reviewerName: reviewerName.trim() || 'Verified Resident',
    };

    addReview(newReview);
    setSubmitSuccess(true);
    setComment('');
    setReviewerName('');

    setTimeout(() => {
      setSubmitSuccess(false);
    }, 4000);
  };

  // Set default issue project if none selected
  useMemo(() => {
    if (!issueProjectId && projects.length > 0) {
      setIssueProjectId(projects[0].id);
    }
  }, [projects, issueProjectId]);

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError(null);

    if (!issueProjectId) {
      setIssueError('Please select a project to report an issue on.');
      return;
    }
    if (!issueTitle.trim()) {
      setIssueError('Please provide a summary title for the issue.');
      return;
    }
    if (!issueDescription.trim() || issueDescription.trim().length < 10) {
      setIssueError('Please write a detailed description (at least 10 characters).');
      return;
    }

    const newReport: IssueReport = {
      id: generateId('iss'),
      projectId: issueProjectId,
      category: issueCategory,
      title: issueTitle.trim(),
      description: issueDescription.trim(),
      locationDetails: issueLocation.trim() || undefined,
      status: 'open',
      submittedAt: new Date().toISOString(),
      reporterName: issueReporter.trim() || 'Concerned Resident',
    };

    addIssueReport(newReport);
    setIssueSuccess(true);
    setIssueTitle('');
    setIssueDescription('');
    setIssueLocation('');
    setIssueReporter('');

    setTimeout(() => {
      setIssueSuccess(false);
    }, 4000);
  };

  const filteredIssueReports = useMemo(() => {
    return issueReports.filter((r) => {
      if (issueStatusFilter === 'all') return true;
      return r.status === issueStatusFilter;
    });
  }, [issueReports, issueStatusFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-teal-600 font-semibold text-xs uppercase tracking-wider mb-1">
          <MessageSquare className="w-4 h-4" />
          Public Transparency & Oversight
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Public Feedback & Accountability
        </h1>
        <p className="text-gray-500 text-sm mt-1 max-w-2xl">
          Empowering citizens with direct visibility into city public works, detour guides, contractor accountability, and community ratings for completed infrastructure.
        </p>
      </div>

      {/* Status Legend */}
      <div className="card p-5 bg-gradient-to-r from-gray-50 to-blue-50/40 border border-blue-100">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          Project Status Legend & Meaning
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <span className="badge bg-blue-100 text-blue-800 font-semibold">Planned</span>
            <p className="text-gray-600 mt-1.5 leading-relaxed text-[11px]">
              Approved and scheduled. Excavation has not yet commenced.
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <span className="badge bg-amber-100 text-amber-800 font-semibold">Ongoing</span>
            <p className="text-gray-600 mt-1.5 leading-relaxed text-[11px]">
              Active ground operations underway according to planned timeline.
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <span className="badge bg-red-100 text-red-800 font-semibold">Delayed</span>
            <p className="text-gray-600 mt-1.5 leading-relaxed text-[11px]">
              Past the original completion commitment with verified delay documentation.
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <span className="badge bg-green-100 text-green-800 font-semibold">Completed</span>
            <p className="text-gray-600 mt-1.5 leading-relaxed text-[11px]">
              Civil works finished, road restored, open for citizen rating.
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <span className="badge bg-rose-100 text-rose-900 font-semibold">Emergency</span>
            <p className="text-gray-600 mt-1.5 leading-relaxed text-[11px]">
              Urgent hazard (e.g. burst pipe) overriding standard scheduling.
            </p>
          </div>
        </div>
      </div>

      {/* Accountability Summary Statistics */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Contractor & Department Accountability Scorecard
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-gray-500 font-medium">Delivered On-Time</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {metrics.onTimeCount}
              <span className="text-xs font-normal text-gray-400 ml-1">
                / {metrics.onTimeCount + metrics.lateCount}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Met original commitment</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-gray-500 font-medium">Delivered Late</div>
            <div className="text-2xl font-bold text-red-500 mt-1">
              {metrics.lateCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Exceeded planned date</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-gray-500 font-medium">Avg Delay (Late Works)</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {metrics.avgDelay} <span className="text-xs font-normal text-gray-500">days</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Beyond promised timeline</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-gray-500 font-medium">Citizen Satisfaction</div>
            <div className="text-2xl font-bold text-blue-600 mt-1 flex items-center gap-1.5">
              {metrics.avgRating}
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Based on {metrics.totalReviews} submitted reviews
            </div>
          </div>
        </div>
      </div>

      {/* Citizen Project Explorer (Transparent Public View) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Active Public Works Explorer
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Plain-language infrastructure transparency for local residents
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search neighborhood or road..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-xs py-1.5"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === 'all'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({projects.length})
              </button>
              <button
                onClick={() => setFilterType('active')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === 'active'
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterType('completed')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === 'completed'
                    ? 'bg-white text-green-700 shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Completed ({completedProjects.length})
              </button>
            </div>
          </div>
        </div>

        {/* Project Cards List */}
        <div className="space-y-3">
          {filteredProjects.map((p) => {
            const isExpanded = expandedProjectId === p.id;
            const delay = calculateDelay(p);

            return (
              <div
                key={p.id}
                className="card border border-gray-200 overflow-hidden hover:border-gray-300 transition-all"
              >
                <div
                  className="p-5 cursor-pointer flex flex-wrap items-start justify-between gap-4"
                  onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                >
                  <div className="space-y-1.5 flex-1 min-w-[280px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                      <span className="badge bg-gray-100 text-gray-700">
                        {CATEGORY_LABELS[p.category]}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {p.segmentId}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                      {p.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {p.department}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {p.location}, {p.neighborhood}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-gray-800">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Promised: {formatDate(p.plannedEndDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-700">
                        Progress: {p.progress}%
                      </div>
                      <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      {delay.isDelayed && (
                        <div className="text-[11px] font-semibold text-red-600 mt-0.5">
                          {delay.comparisonLabel}
                        </div>
                      )}
                    </div>

                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/50 space-y-4 text-xs animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reason & Contractor */}
                      <div className="space-y-3">
                        <div>
                          <strong className="text-gray-900 block font-semibold mb-0.5">
                            Why is this work taking place?
                          </strong>
                          <p className="text-gray-600 leading-relaxed bg-white p-3 rounded-lg border border-gray-200">
                            {p.reason}
                          </p>
                        </div>

                        <div>
                          <strong className="text-gray-900 block font-semibold mb-0.5">
                            Responsible Contractor:
                          </strong>
                          <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                            {p.contractorName}
                          </p>
                        </div>
                      </div>

                      {/* Disruption & Mitigation / Alternate Routes */}
                      <div className="space-y-3">
                        <div>
                          <strong className="text-gray-900 block font-semibold mb-0.5">
                            Expected Inconvenience:
                          </strong>
                          <p className="text-gray-600 leading-relaxed bg-white p-3 rounded-lg border border-gray-200">
                            {p.inconvenienceDescription || 'Standard traffic restrictions apply.'}
                          </p>
                        </div>

                        <div>
                          <strong className="text-teal-900 flex items-center gap-1 font-semibold mb-0.5">
                            <Navigation className="w-3.5 h-3.5 text-teal-600" />
                            Alternative Route / Detour Guidance:
                          </strong>
                          <p className="text-teal-800 bg-teal-50/70 p-3 rounded-lg border border-teal-200 leading-relaxed">
                            {p.alternativeRoute || 'No special detours posted. Follow traffic signs.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delay Explanations if any */}
                    {p.delayRecords.length > 0 && (
                      <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
                        <strong className="text-amber-900 font-semibold flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Documented Delay Justification:
                        </strong>
                        <div className="space-y-1 text-amber-800">
                          {p.delayRecords.map((dr) => (
                            <div key={dr.id} className="text-[11px]">
                              • <span className="font-semibold">{dr.reason}</span> — {dr.notes} (Revised completion: {formatDate(dr.revisedDate)})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <NavLink
                        to={`/projects/${p.id}`}
                        className="btn-secondary text-xs"
                      >
                        View Full Project Audit Page →
                      </NavLink>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Perspective Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {feedbackTab === 'reviews' ? (
              <>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Citizen Reviews & Quality Ratings
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Citizen Issue Reports & Grievances
              </>
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {feedbackTab === 'reviews'
              ? 'Public evaluation of delivered infrastructure projects.'
              : 'Direct citizen issue reports regarding active worksites, safety hazards, and disruptions.'}
          </p>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFeedbackTab('reviews')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
              feedbackTab === 'reviews'
                ? 'bg-white text-gray-900 shadow-sm font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Completed Works Reviews ({reviews.length})</span>
          </button>
          <button
            onClick={() => setFeedbackTab('issues')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
              feedbackTab === 'issues'
                ? 'bg-white text-amber-900 shadow-sm font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Citizen Issue Reports ({issueReports.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Reviews */}
      {feedbackTab === 'reviews' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Review Submission Form */}
          <div className="card p-6 lg:col-span-1 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Submit Citizen Review
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Help keep contractors accountable by rating completed civic works.
              </p>
            </div>

            {submitSuccess && (
              <div className="p-3 bg-green-50 text-green-800 border border-green-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Thank you! Your feedback has been verified and added to the public record.</span>
              </div>
            )}

            {formError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="label text-xs">Select Completed Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="select text-xs"
                  required
                >
                  {completedProjects.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.title} ({cp.neighborhood})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh P. or local resident"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs">Star Rating</label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const active = (hoverRating || rating) >= starVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            active
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-semibold text-gray-700 ml-2">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="label text-xs">Your Feedback / Experience</label>
                <textarea
                  rows={3}
                  placeholder="Describe road finish quality, timeliness, clean-up, or issues..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input text-xs"
                  required
                />
                <span className="text-[10px] text-gray-400">Minimum 10 characters</span>
              </div>

              <button type="submit" className="btn-primary w-full text-xs justify-center py-2.5">
                <Send className="w-3.5 h-3.5" />
                Publish Public Review
              </button>
            </form>
          </div>

          {/* Middle/Right: Rating Distribution & Recent Reviews */}
          <div className="card p-6 lg:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Community Reviews</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Public assessment of delivered civic infrastructure
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-black text-gray-900 leading-none">
                    {metrics.avgRating} / 5
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">Average rating</div>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(Number(metrics.avgRating))
                          ? 'fill-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Rating Breakdown Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gray-50/60 p-4 rounded-xl border border-gray-100">
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-2">Rating Distribution</div>
                <div className="space-y-1.5 text-xs">
                  {ratingDistribution.map((item) => (
                    <div key={item.star} className="flex items-center gap-2">
                      <span className="w-14 text-[11px] text-gray-500">{item.star}</span>
                      <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full"
                          style={{
                            width: `${
                              reviews.length > 0 ? (item.count / reviews.length) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="w-6 text-right text-[11px] font-semibold text-gray-700">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-2 border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0">
                <div className="font-semibold text-gray-800">Transparency Note:</div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Reviews are tied to completed infrastructure projects. Fictional demo dataset for hackathon showcase. Citizen sentiment directly impacts contractor evaluation scores.
                </p>
              </div>
            </div>

            {/* Recent Reviews List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Recent Submissions ({reviews.length})
              </h4>

              <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
                {reviews.map((rev) => {
                  const targetProj = projects.find((p) => p.id === rev.projectId);

                  return (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{rev.reviewerName}</span>
                          <span className="text-[11px] text-gray-400">·</span>
                          <span className="text-[11px] text-gray-500">
                            {formatDateTime(rev.submittedAt)}
                          </span>
                        </div>

                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating ? 'fill-amber-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-gray-700 leading-relaxed italic">
                        "{rev.comment}"
                      </p>

                      {targetProj && (
                        <div className="text-[11px] text-gray-400 pt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span>Project: </span>
                          <NavLink
                            to={`/projects/${targetProj.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {targetProj.title}
                          </NavLink>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Issue Reports */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Issue Submission Form */}
          <div className="card p-6 lg:col-span-1 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Report an Issue
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Report safety hazards, blocked driveways, noise, or prolonged inactivity on any civic project.
              </p>
            </div>

            {issueSuccess && (
              <div className="p-3 bg-green-50 text-green-800 border border-green-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Issue report logged! It has been dispatched to municipal inspectors.</span>
              </div>
            )}

            {issueError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{issueError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitIssue} className="space-y-4">
              <div>
                <label className="label text-xs">Project *</label>
                <select
                  value={issueProjectId}
                  onChange={(e) => setIssueProjectId(e.target.value)}
                  className="select text-xs"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.neighborhood})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Issue Category *</label>
                <select
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value as IssueCategory)}
                  className="select text-xs"
                >
                  <option value="safety_hazard">⚠️ Safety Hazard / Open Trench</option>
                  <option value="access_blocked">🚫 Resident / Driveway Access Blocked</option>
                  <option value="excessive_noise">🔊 Excessive Noise / Night Construction</option>
                  <option value="prolonged_inactivity">⏳ Prolonged Inactivity / Abandoned Site</option>
                  <option value="water_power_leak">💧 Water Leak / Exposed Wire Risk</option>
                  <option value="other">ℹ️ Other Public Concern</option>
                </select>
              </div>

              <div>
                <label className="label text-xs">Summary Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Broken barricade near primary school"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Specific Location / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Opposite crossroad bus shelter"
                  value={issueLocation}
                  onChange={(e) => setIssueLocation(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs">Description of Problem *</label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue, hazards, and impact on pedestrian/traffic flow…"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="input text-xs"
                  required
                />
                <span className="text-[10px] text-gray-400">Minimum 10 characters</span>
              </div>

              <div>
                <label className="label text-xs">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Resident or anonymous"
                  value={issueReporter}
                  onChange={(e) => setIssueReporter(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <button type="submit" className="btn-primary w-full text-xs justify-center py-2.5 bg-amber-600 hover:bg-amber-700">
                <Send className="w-3.5 h-3.5" />
                Submit Citizen Report
              </button>
            </form>
          </div>

          {/* Right: Issue Reports List */}
          <div className="card p-6 lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Municipal Issue Grievance Log</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track reported safety hazards, blocked access, and municipal responses
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium">
                {(['all', 'open', 'under_review', 'resolved'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setIssueStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg transition ${
                      issueStatusFilter === s
                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {s === 'all' ? 'All' : s === 'open' ? 'Open' : s === 'under_review' ? 'Under Review' : 'Resolved'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
              {filteredIssueReports.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No issues found matching this filter.
                </div>
              ) : (
                filteredIssueReports.map((iss) => {
                  const targetProj = projects.find((p) => p.id === iss.projectId);
                  const statusConfig = {
                    open: { label: 'Open', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                    under_review: { label: 'Under Municipal Review', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200' },
                  }[iss.status];

                  return (
                    <div
                      key={iss.id}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{iss.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Reported by {iss.reporterName || 'Resident'} · {formatDateTime(iss.submittedAt)}
                            {iss.locationDetails ? ` · ${iss.locationDetails}` : ''}
                          </div>
                        </div>

                        {targetProj && (
                          <NavLink
                            to={`/projects/${targetProj.id}`}
                            className="text-blue-600 hover:underline text-[11px] font-medium"
                          >
                            {targetProj.title} →
                          </NavLink>
                        )}
                      </div>

                      <p className="text-gray-700 leading-relaxed bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                        {iss.description}
                      </p>

                      {iss.officialResponse && (
                        <div className="bg-teal-50 border border-teal-200 text-teal-900 p-3 rounded-lg text-xs">
                          <strong className="text-teal-800 font-semibold block mb-0.5">Official Response:</strong>
                          {iss.officialResponse}
                        </div>
                      )}

                      {/* Government controls */}
                      {isGovernment && (
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-gray-500 font-medium">Government Official Action:</span>
                          <div className="flex items-center gap-1.5">
                            {iss.status !== 'under_review' && (
                              <button
                                onClick={() => updateIssueReportStatus(iss.id, 'under_review')}
                                className="px-2.5 py-1 text-[11px] rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium border border-blue-200 transition"
                              >
                                Mark Under Review
                              </button>
                            )}
                            {iss.status !== 'resolved' && (
                              <button
                                onClick={() => {
                                  const resp = window.prompt('Enter official resolution note for the public record:');
                                  updateIssueReportStatus(iss.id, 'resolved', resp || 'Inspected and resolved by municipal civil team.');
                                }}
                                className="px-2.5 py-1 text-[11px] rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium border border-green-200 transition"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
