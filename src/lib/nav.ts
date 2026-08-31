export interface NavItem {
  label: string;
  href: string;
}

export const STUDENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "Practice", href: "/student/practice" },
  { label: "Assignments", href: "/student/assignments" },
  { label: "Assessments", href: "/student/assessments" },
  { label: "Mock Interview", href: "/student/mock-interviews" },
  { label: "Group Discussion", href: "/student/group-discussions" },
];

export const STUDENT_MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/student/dashboard" },
  { label: "Practice", href: "/student/practice" },
  { label: "AI", href: "/student/mock-interviews" },
  { label: "Progress", href: "/student/progress" },
  { label: "Profile", href: "/student/profile" },
];

export const TEACHER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/teacher/dashboard" },
  { label: "Questions", href: "/teacher/questions" },
  { label: "Assignments", href: "/teacher/assignments" },
  { label: "Assessments", href: "/teacher/assessments" },
  { label: "Mock Interviews", href: "/teacher/mock-interviews" },
  { label: "Group Discussions", href: "/teacher/group-discussions" },
];