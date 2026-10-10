// ============================================================
// CitySync — Public Feedback & Accountability Page
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
  Copy,
  Check,
  Hash,
  ExternalLink,
  RotateCcw,
  Info,
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
import { useTranslation } from '../context/LanguageContext';
import {
  calculateDelay,
  formatDate,
  formatDateTime,
  generateId,
  generateComplaintReference,
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
  const { t } = useTranslation();
  const { projects, reviews, issueReports } = state;

  // Tab state between Reviews, Issue Reports, and Track Complaint
  const [feedbackTab, setFeedbackTab] = useState<'reviews' | 'issues' | 'track'>('reviews');

  // Complaint Tracking state
  const [lookupRef, setLookupRef] = useState('');
  const [searchedRef, setSearchedRef] = useState<string | null>(null);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Government Official Response Modal state
  const [respondingIssue, setRespondingIssue] = useState<IssueReport | null>(null);
  const [officialStatusInput, setOfficialStatusInput] = useState<IssueReportStatus>('under_review');
  const [officialResponseText, setOfficialResponseText] = useState('');

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

    const existingRefs = issueReports.map((r) => r.referenceNumber).filter(Boolean) as string[];
    const referenceNumber = generateComplaintReference(existingRefs);
    const now = new Date().toISOString();

    const newReport: IssueReport = {
      id: generateId('iss'),
      referenceNumber,
      projectId: issueProjectId,
      category: issueCategory,
      title: issueTitle.trim(),
      description: issueDescription.trim(),
      locationDetails: issueLocation.trim() || undefined,
      status: 'open',
      submittedAt: now,
      updatedAt: now,
      reporterName: issueReporter.trim() || 'Concerned Resident',
    };

    addIssueReport(newReport);
    setSubmittedReference(referenceNumber);
    setIssueSuccess(true);
    setIssueTitle('');
    setIssueDescription('');
    setIssueLocation('');
    setIssueReporter('');
  };

  const handleTrackComplaint = (refToTrack?: string) => {
    const target = refToTrack !== undefined ? refToTrack : lookupRef;
    if (!target.trim()) return;
    setSearchedRef(target.trim());
    setFeedbackTab('track');
  };

  const trackedIssue = useMemo(() => {
    if (!searchedRef) return null;
    const clean = searchedRef.trim().toUpperCase();
    return issueReports.find(
      (r) =>
        (r.referenceNumber && r.referenceNumber.toUpperCase() === clean) ||
        r.id.toUpperCase() === clean
    );
  }, [searchedRef, issueReports]);

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
        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <MessageSquare className="w-4 h-4" />
          Public Transparency & Oversight
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          {isGovernment ? t('feedback.title') : t('feedback.titlePublic')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">
          {t('feedback.subtitle')}
        </p>
      </div>

      {/* Status Legend */}
      <div className="card p-5 bg-gradient-to-r from-gray-50 to-blue-50/40 dark:from-gray-800 dark:to-blue-950/20 border border-blue-100 dark:border-blue-900/40">
        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-400 dark:text-blue-400" />
          Project Status Legend & Meaning
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-white dark:bg-gray-750 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="badge bg-purple-500/20 dark:bg-purple-950/50 text-purple-200 dark:text-purple-300 font-semibold">Planned</span>
            <p className="text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed text-[11px]">
              Approved and scheduled. Excavation has not yet commenced.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-750 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="badge bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold">Ongoing</span>
            <p className="text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed text-[11px]">
              Active ground operations underway according to planned timeline.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-750 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="badge bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-semibold">Delayed</span>
            <p className="text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed text-[11px]">
              Past the original completion commitment with verified delay documentation.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-750 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="badge bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 font-semibold">Completed</span>
            <p className="text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed text-[11px]">
              Civil works finished, road restored, open for citizen rating.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-750 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="badge bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 font-semibold">Emergency</span>
            <p className="text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed text-[11px]">
              Urgent hazard (e.g. burst pipe) overriding standard scheduling.
            </p>
          </div>
        </div>
      </div>

      {/* Accountability Summary Statistics */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400 dark:text-blue-400" />
          Contractor & Department Accountability Scorecard
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Delivered On-Time</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {metrics.onTimeCount}
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">
                / {metrics.onTimeCount + metrics.lateCount}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Met original commitment</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Delivered Late</div>
            <div className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1">
              {metrics.lateCount}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Exceeded planned date</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Avg Delay (Late Works)</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {metrics.avgDelay} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">days</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Beyond promised timeline</div>
          </div>

          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Citizen Satisfaction</div>
            <div className="text-2xl font-bold text-purple-400 dark:text-blue-400 mt-1 flex items-center gap-1.5">
              {metrics.avgRating}
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Based on {metrics.totalReviews} submitted reviews
            </div>
          </div>
        </div>
      </div>

      {/* Citizen Project Explorer (Transparent Public View) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Active Public Works Explorer
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Plain-language infrastructure transparency for local residents
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search neighborhood or road..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-xs py-1.5 dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                All ({projects.length})
              </button>
              <button
                onClick={() => setFilterType('active')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === 'active'
                    ? 'bg-white dark:bg-gray-700 text-purple-300 dark:text-blue-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterType('completed')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === 'completed'
                    ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
                className="card border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-all"
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
                      <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {CATEGORY_LABELS[p.category]}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {p.segmentId}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                      {p.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-300 pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        {p.department}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        {p.location}, {p.neighborhood}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                        <Calendar className="w-3.5 h-3.5 text-purple-400 dark:text-blue-400" />
                        Promised: {formatDate(p.plannedEndDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Progress: {p.progress}%
                      </div>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-[#7C3AED] dark:bg-[#7C3AED] h-full rounded-full"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      {delay.isDelayed && (
                        <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-0.5">
                          {delay.comparisonLabel}
                        </div>
                      )}
                    </div>

                    <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
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
                  <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-850/50 space-y-4 text-xs animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reason & Contractor */}
                      <div className="space-y-3">
                        <div>
                          <strong className="text-gray-900 dark:text-gray-100 block font-semibold mb-0.5">
                            Why is this work taking place?
                          </strong>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            {p.reason}
                          </p>
                        </div>

                        <div>
                          <strong className="text-gray-900 dark:text-gray-100 block font-semibold mb-0.5">
                            Responsible Contractor:
                          </strong>
                          <p className="text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            {p.contractorName}
                          </p>
                        </div>
                      </div>

                      {/* Disruption & Mitigation / Alternate Routes */}
                      <div className="space-y-3">
                        <div>
                          <strong className="text-gray-900 dark:text-gray-100 block font-semibold mb-0.5">
                            Expected Inconvenience:
                          </strong>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            {p.inconvenienceDescription || 'Standard traffic restrictions apply.'}
                          </p>
                        </div>

                        <div>
                          <strong className="text-purple-100 dark:text-purple-200 flex items-center gap-1 font-semibold mb-0.5">
                            <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            Alternative Route / Detour Guidance:
                          </strong>
                          <p className="text-purple-200 dark:text-purple-200 bg-purple-950/20 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-500/30 dark:border-purple-500/40 leading-relaxed">
                            {p.alternativeRoute || 'No special detours posted. Follow traffic signs.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delay Explanations if any */}
                    {p.delayRecords.length > 0 && (
                      <div className="bg-amber-50/80 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/80">
                        <strong className="text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          Documented Delay Justification:
                        </strong>
                        <div className="space-y-1 text-amber-800 dark:text-amber-300">
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {feedbackTab === 'reviews' ? (
              <>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Citizen Reviews & Quality Ratings
              </>
            ) : feedbackTab === 'issues' ? (
              <>
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Citizen Issue Reports & Grievances
              </>
            ) : (
              <>
                <Search className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Citizen Complaint Reference Tracker
              </>
            )}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {feedbackTab === 'reviews'
              ? 'Public evaluation of delivered infrastructure projects.'
              : feedbackTab === 'issues'
              ? 'Direct citizen issue reports regarding active worksites, safety hazards, and disruptions.'
              : 'Look up complaint status, engineering responses, and resolution progress using your tracking reference.'}
          </p>
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFeedbackTab('reviews')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
              feedbackTab === 'reviews'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Completed Works Reviews ({reviews.length})</span>
          </button>
          <button
            onClick={() => setFeedbackTab('issues')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
              feedbackTab === 'issues'
                ? 'bg-white dark:bg-gray-700 text-amber-900 dark:text-amber-300 shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Citizen Issue Reports ({issueReports.length})</span>
          </button>
          <button
            onClick={() => setFeedbackTab('track')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
              feedbackTab === 'track'
                ? 'bg-white dark:bg-gray-700 text-teal-800 dark:text-teal-300 shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Track Complaint by Ref</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Reviews */}
      {feedbackTab === 'reviews' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Review Submission Form */}
          <div className="card p-6 lg:col-span-1 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Submit Citizen Review
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Help keep contractors accountable by rating completed civic works.
              </p>
            </div>

            {submitSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span>Thank you! Your feedback has been verified and added to the public record.</span>
              </div>
            )}

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="label text-xs dark:text-gray-300">Select Completed Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="select text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
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
                <label className="label text-xs dark:text-gray-300">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh P. or local resident"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="input text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="label text-xs dark:text-gray-300">Star Rating</label>
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
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-2">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="label text-xs dark:text-gray-300">Your Feedback / Experience</label>
                <textarea
                  rows={3}
                  placeholder="Describe road finish quality, timeliness, clean-up, or issues..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">Minimum 10 characters</span>
              </div>

              <button type="submit" className="btn-primary w-full text-xs justify-center py-2.5">
                <Send className="w-3.5 h-3.5" />
                Publish Public Review
              </button>
            </form>
          </div>

          {/* Middle/Right: Rating Distribution & Recent Reviews */}
          <div className="card p-6 lg:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Community Reviews</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Public assessment of delivered civic infrastructure
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-black text-gray-900 dark:text-gray-100 leading-none">
                    {metrics.avgRating} / 5
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Average rating</div>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(Number(metrics.avgRating))
                          ? 'fill-amber-400'
                          : 'text-gray-200 dark:text-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Rating Breakdown Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gray-50/60 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Rating Distribution</div>
                <div className="space-y-1.5 text-xs">
                  {ratingDistribution.map((item) => (
                    <div key={item.star} className="flex items-center gap-2">
                      <span className="w-14 text-[11px] text-gray-500 dark:text-gray-400">{item.star}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full"
                          style={{
                            width: `${
                              reviews.length > 0 ? (item.count / reviews.length) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="w-6 text-right text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 md:pl-4 pt-3 md:pt-0">
                <div className="font-semibold text-gray-800 dark:text-gray-200">Transparency Note:</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Reviews are tied to completed infrastructure projects. Fictional demo dataset for hackathon showcase. Citizen sentiment directly impacts contractor evaluation scores.
                </p>
              </div>
            </div>

            {/* Recent Reviews List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Recent Submissions ({reviews.length})
              </h4>

              <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
                {reviews.map((rev) => {
                  const targetProj = projects.find((p) => p.id === rev.projectId);

                  return (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-750 hover:border-gray-200 dark:hover:border-gray-650 transition space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{rev.reviewerName}</span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">·</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {formatDateTime(rev.submittedAt)}
                          </span>
                        </div>

                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating ? 'fill-amber-400' : 'text-gray-200 dark:text-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                        "{rev.comment}"
                      </p>

                      {targetProj && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-400 pt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span>Project: </span>
                          <NavLink
                            to={`/projects/${targetProj.id}`}
                            className="text-purple-400 dark:text-blue-400 hover:underline font-medium"
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
      ) : feedbackTab === 'issues' ? (
        /* Tab 2: Issue Reports */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Issue Submission Form */}
          <div className="card p-6 lg:col-span-1 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Report an Issue
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Report safety hazards, blocked driveways, noise, or prolonged inactivity on any civic project.
              </p>
            </div>

            {issueSuccess && (
              <div className="p-3.5 bg-green-50 dark:bg-green-950/60 text-green-900 dark:text-green-200 border border-green-200 dark:border-green-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-green-800 dark:text-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>Citizen grievance report submitted!</span>
                </div>
                {submittedReference && (
                  <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-green-200 dark:border-green-800 space-y-1.5">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Tracking Reference:
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 tracking-wider">
                        {submittedReference}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(submittedReference);
                            setCopiedRef(true);
                            setTimeout(() => setCopiedRef(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-[10px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
                        >
                          {copiedRef ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                          {copiedRef ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLookupRef(submittedReference);
                            handleTrackComplaint(submittedReference);
                          }}
                          className="px-2 py-0.5 rounded bg-teal-600 text-white text-[10px] font-medium hover:bg-teal-700"
                        >
                          Track Now →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {issueError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span>{issueError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitIssue} className="space-y-4">
              <div>
                <label className="label text-xs dark:text-gray-300">Project *</label>
                <select
                  value={issueProjectId}
                  onChange={(e) => setIssueProjectId(e.target.value)}
                  className="select text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
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
                <label className="label text-xs dark:text-gray-300">Issue Category *</label>
                <select
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value as IssueCategory)}
                  className="select text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
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
                <label className="label text-xs dark:text-gray-300">Summary Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Broken barricade near primary school"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="input text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="label text-xs dark:text-gray-300">Specific Location / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Opposite crossroad bus shelter"
                  value={issueLocation}
                  onChange={(e) => setIssueLocation(e.target.value)}
                  className="input text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="label text-xs dark:text-gray-300">Description of Problem *</label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue, hazards, and impact on pedestrian/traffic flow…"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="input text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
                  required
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">Minimum 10 characters</span>
              </div>

              <div>
                <label className="label text-xs dark:text-gray-300">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Resident or anonymous"
                  value={issueReporter}
                  onChange={(e) => setIssueReporter(e.target.value)}
                  className="input text-xs dark:bg-gray-900 dark:border-gray-750 dark:text-gray-100"
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Municipal Issue Grievance Log</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Track reported safety hazards, blocked access, and municipal responses
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-medium">
                {(['all', 'open', 'under_review', 'resolved'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setIssueStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg transition ${
                      issueStatusFilter === s
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {s === 'all' ? 'All' : s === 'open' ? 'Open' : s === 'under_review' ? 'Under Review' : 'Resolved'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
              {filteredIssueReports.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
                  No issues found matching this filter.
                </div>
              ) : (
                filteredIssueReports.map((iss) => {
                  const targetProj = projects.find((p) => p.id === iss.projectId);
                  const statusConfig = {
                    open: { label: 'Open', color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
                    under_review: { label: 'Under Municipal Review', color: 'bg-purple-500/20 dark:bg-purple-950/50 text-purple-200 dark:text-purple-300 border-purple-500/30 dark:border-purple-500/40' },
                    resolved: { label: 'Resolved', color: 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' },
                  }[iss.status];

                  return (
                    <div
                      key={iss.id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-650 transition space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{iss.title}</span>
                            {iss.referenceNumber && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-teal-800 dark:text-teal-300 font-bold border border-gray-200 dark:border-gray-650">
                                Ref: {iss.referenceNumber}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Reported by {iss.reporterName || 'Resident'} · {formatDateTime(iss.submittedAt)}
                            {iss.locationDetails ? ` · ${iss.locationDetails}` : ''}
                          </div>
                        </div>

<div className="flex items-center gap-2">
                          {iss.referenceNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                setLookupRef(iss.referenceNumber!);
                                handleTrackComplaint(iss.referenceNumber);
                              }}
                              className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold flex items-center gap-0.5"
                            >
                              Track Status →
                            </button>
                          )}
                          {targetProj && (
                            <NavLink
                              to={`/projects/${targetProj.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-medium"
                            >
                              {targetProj.title} →
                            </NavLink>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50/70 dark:bg-gray-800/80 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        {iss.description}
                      </p>

                      {iss.officialResponse && (
                        <div className="bg-purple-950/20 dark:bg-purple-950/40 border border-purple-500/30 dark:border-purple-500/30 text-purple-100 dark:text-purple-200 p-3 rounded-lg text-xs">
                          <strong className="text-purple-200 dark:text-teal-300 font-semibold block mb-0.5">Official Response:</strong>
                          {iss.officialResponse}
                        </div>
                      )}

                      {/* Government controls */}
                      {isGovernment && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Government Official Action:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRespondingIssue(iss);
                                setOfficialStatusInput(iss.status);
                                setOfficialResponseText(iss.officialResponse || '');
                              }}
                              className="px-2.5 py-1 text-[11px] rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 font-semibold border border-teal-200 dark:border-teal-800 transition"
                            >
                              Update Status & Response
                            </button>
                            {iss.status !== 'under_review' && (
                              <button
                                type="button"
                                onClick={() => updateIssueReportStatus(iss.id, 'under_review')}
                                className="px-2.5 py-1 text-[11px] rounded bg-purple-950/20 dark:bg-purple-950/50 text-purple-300 dark:text-purple-300 hover:bg-purple-500/20 dark:hover:bg-purple-900/40 font-medium border border-purple-500/30 dark:border-purple-500/40 transition"
                              >
                                Mark Under Review
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
      ) : (
        /* Tab 3: Track Complaint by Reference */
        <div className="space-y-6">
          {/* Tracking Search Card */}
          <div className="card p-6 bg-gradient-to-r from-teal-50/80 via-white to-blue-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Citizen Grievance & Complaint Tracker
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
                  Enter your unique municipal complaint reference (e.g. <span className="font-mono font-semibold">CS-2026-ABC123</span>) to check the real-time inspection status and review the engineering team’s official response.
                </p>
              </div>
              <div className="text-[11px] px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg">
                ⚠️ Client-Side Demo Grievance Log
              </div>
            </div>

            {/* Input & Track Button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrackComplaint();
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="relative flex-1">
                <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter reference number (e.g. CS-2026-KAS821)…"
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 shrink-0"
              >
                <Search className="w-4 h-4" />
                Track Complaint
              </button>
            </form>

            {/* Clickable Quick Examples */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Try demonstration references:</span>
              {[
                { ref: 'CS-2026-KAS821', label: 'Kasturba Nagar (Under Review)' },
                { ref: 'CS-2026-VEL449', label: 'Velachery (Resolved)' },
                { ref: 'CS-2026-MYL105', label: 'Mylapore (Open)' },
              ].map((ex) => (
                <button
                  key={ex.ref}
                  type="button"
                  onClick={() => {
                    setLookupRef(ex.ref);
                    handleTrackComplaint(ex.ref);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800/80 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-mono text-[11px] hover:bg-teal-100 dark:hover:bg-teal-900 transition"
                >
                  {ex.ref} <span className="font-sans text-[10px] text-teal-600 dark:text-teal-400">({ex.label.split(' ')[0]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Result States */}
          {searchedRef && trackedIssue ? (
            /* Found State */
            <div className="card p-6 border-teal-300 dark:border-teal-700 shadow-md space-y-5 animate-fade-in">
              <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-extrabold bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 px-3 py-1 rounded-lg border border-teal-300 dark:border-teal-800 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      {trackedIssue.referenceNumber || trackedIssue.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(trackedIssue.referenceNumber || trackedIssue.id);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2000);
                      }}
                      className="px-2 py-1 text-[11px] rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
                    >
                      {copiedRef ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      {copiedRef ? 'Copied' : 'Copy'}
                    </button>
                    {/* Status badge */}
                    {trackedIssue.status === 'open' && (
                      <span className="badge bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-semibold px-2.5 py-0.5">
                        Open — Awaiting Municipal Inspection
                      </span>
                    )}
                    {trackedIssue.status === 'under_review' && (
                      <span className="badge bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-xs font-semibold px-2.5 py-0.5">
                        Under Municipal Review — Inspection Assigned
                      </span>
                    )}
                    {trackedIssue.status === 'resolved' && (
                      <span className="badge bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 text-xs font-semibold px-2.5 py-0.5">
                        Resolved — Corrective Action Completed
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 pt-1">
                    {trackedIssue.title}
                  </h3>
                </div>

                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  <div>Submitted: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatDateTime(trackedIssue.submittedAt)}</span></div>
                  {trackedIssue.updatedAt && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      Last Updated: {formatDateTime(trackedIssue.updatedAt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Related Project Information */}
              {(() => {
                const relatedProj = projects.find((p) => p.id === trackedIssue.projectId);
                return relatedProj ? (
                  <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Associated Public Works Project
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {relatedProj.title}
                      </div>
                      <NavLink
                        to={`/projects/${relatedProj.id}`}
                        className="text-teal-600 dark:text-teal-400 hover:underline font-medium flex items-center gap-1"
                      >
                        View Project Full Details <ExternalLink className="w-3 h-3" />
                      </NavLink>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 text-[11px] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-400" /> {relatedProj.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" /> {relatedProj.location}, {relatedProj.neighborhood}
                      </span>
                      <span className="font-mono text-gray-400">Segment: {relatedProj.segmentId}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Description & Location */}
              <div className="space-y-2 text-xs">
                <div className="font-bold text-gray-700 dark:text-gray-300">Issue Description</div>
                <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 leading-relaxed">
                  {trackedIssue.description}
                </div>
                {trackedIssue.locationDetails && (
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>Location Details: <strong className="text-gray-700 dark:text-gray-300">{trackedIssue.locationDetails}</strong></span>
                  </div>
                )}
                {trackedIssue.reporterName && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[11px]">
                    <User className="w-3 h-3 text-gray-400" />
                    <span>Reported by: {trackedIssue.reporterName}</span>
                  </div>
                )}
              </div>

              {/* Official Municipal Response */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Official Municipal Engineering Response
                </div>
                {trackedIssue.officialResponse ? (
                  <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs space-y-1">
                    <div className="font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Recorded Official Finding & Mitigation Action:
                    </div>
                    <p className="leading-relaxed pl-5 text-gray-800 dark:text-gray-200">
                      {trackedIssue.officialResponse}
                    </p>
                    {trackedIssue.updatedAt && (
                      <div className="text-[10px] text-teal-700 dark:text-teal-400 pl-5 pt-1">
                        Recorded timestamp: {formatDateTime(trackedIssue.updatedAt)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs">
                    No official engineering response has been logged yet for this report. The municipal coordination cell typically investigates and updates active reports within 24–48 working hours.
                  </div>
                )}
              </div>

              {/* Government Coordinator Action */}
              {isGovernment && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <div className="text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Coordinator Administration:</span> Update this complaint’s official resolution note or status.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRespondingIssue(trackedIssue);
                      setOfficialStatusInput(trackedIssue.status);
                      setOfficialResponseText(trackedIssue.officialResponse || '');
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Update Official Response & Status
                  </button>
                </div>
              )}

              {/* Demo Notice */}
              <div className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-750 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Demonstration Data:</strong> This record is stored in your client-side browser session for demonstration purposes and is not connected to a live municipal ticketing system.
                </span>
              </div>
            </div>
          ) : searchedRef ? (
            /* Not Found State */
            <div className="card p-8 border-red-200 dark:border-red-900 text-center space-y-3 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                No Complaint Found with Reference: <span className="font-mono text-red-600 dark:text-red-400">{searchedRef}</span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Please double-check the tracking code. Valid complaint references follow the pattern <span className="font-mono font-semibold">CS-2026-XXXXXX</span>.
              </p>
              <div className="pt-2 flex justify-center gap-2 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLookupRef('');
                    setSearchedRef(null);
                  }}
                  className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Clear Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLookupRef('CS-2026-KAS821');
                    handleTrackComplaint('CS-2026-KAS821');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                  Try Sample: CS-2026-KAS821
                </button>
              </div>
            </div>
          ) : (
            /* Initial Empty State */
            <div className="card p-8 text-center space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Track Any Infrastructure Complaint in Chennai
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg mx-auto mt-1">
                  Enter your complaint reference in the search box above to check if work crews have inspected the site, viewed contractor logs, or posted an official response.
                </p>
              </div>
              <div className="max-w-xl mx-auto pt-2">
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 text-left mb-2">
                  Recent Grievances Logged in System:
                </div>
                <div className="space-y-2 text-left">
                  {issueReports.slice(0, 3).map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {rep.title}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          Ref: {rep.referenceNumber || rep.id} · {formatDateTime(rep.submittedAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const ref = rep.referenceNumber || rep.id;
                          setLookupRef(ref);
                          handleTrackComplaint(ref);
                        }}
                        className="px-3 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg text-xs font-semibold hover:bg-teal-100 shrink-0"
                      >
                        Track Status →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Response Modal (Replaces window.prompt) */}
      {respondingIssue && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Official Municipal Action & Response
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                  {respondingIssue.referenceNumber ? `Ref: ${respondingIssue.referenceNumber}` : respondingIssue.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRespondingIssue(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Complaint: </span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">{respondingIssue.title}</span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Update Status *
                </label>
                <select
                  value={officialStatusInput}
                  onChange={(e) => setOfficialStatusInput(e.target.value as IssueReportStatus)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="open">Open (Under initial observation)</option>
                  <option value="under_review">Under Municipal Review (Inspection team assigned)</option>
                  <option value="resolved">Resolved (Corrective engineering action completed)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Official Resolution / Inspection Note *
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail municipal findings, inspection actions, or mitigation timeline…"
                  value={officialResponseText}
                  onChange={(e) => setOfficialResponseText(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setRespondingIssue(null)}
                className="px-4 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateIssueReportStatus(
                    respondingIssue.id,
                    officialStatusInput,
                    officialResponseText.trim() || undefined
                  );
                  setRespondingIssue(null);
                }}
                className="px-4 py-2 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
              >
                Save Official Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
