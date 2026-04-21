/**
 * Static mapping of WMSU college -> common departments/programs.
 * Used by the public sign-up form to filter the Department dropdown
 * after a College is chosen.
 *
 * Colleges not present here simply fall back to a single "Other" option
 * so the sign-up flow never blocks a user.
 */
export const COLLEGE_DEPARTMENTS: Record<string, string[]> = {
  'College of Law': [
    'Juris Doctor',
    'Legal Management',
  ],
  'College of Agriculture': [
    'Agronomy',
    'Animal Science',
    'Horticulture',
    'Soil Science',
  ],
  'College of Liberal Arts': [
    'English',
    'Filipino',
    'History',
    'Literature',
    'Political Science',
    'Psychology',
    'Sociology',
  ],
  'College of Architecture': [
    'Architecture',
    'Interior Design',
  ],
  'College of Nursing': [
    'Nursing',
    'Midwifery',
  ],
  'College of Asian & Islamic Studies': [
    'Arabic Studies',
    'Asian Studies',
    'Islamic Studies',
  ],
  'College of Computing Studies': [
    'Department of Computer Science',
    'Department of Information Technology',
    'Department of Information Systems',
  ],
  'College of Forestry & Environmental Studies': [
    'Forestry',
    'Environmental Science',
  ],
  'College of Criminal Justice Education': [
    'Criminology',
    'Forensic Science',
  ],
  'College of Home Economics': [
    'Hotel and Restaurant Management',
    'Nutrition and Dietetics',
    'Food Technology',
  ],
  'College of Engineering': [
    'Civil Engineering',
    'Electrical Engineering',
    'Electronics Engineering',
    'Mechanical Engineering',
    'Computer Engineering',
  ],
  'College of Medicine': [
    'Doctor of Medicine',
  ],
  'College of Public Administration & Development Studies': [
    'Public Administration',
    'Development Studies',
  ],
  'College of Sports Science & Physical Education': [
    'Physical Education',
    'Sports Science',
  ],
  'College of Science and Mathematics': [
    'Biology',
    'Chemistry',
    'Mathematics',
    'Physics',
    'Statistics',
  ],
  'College of Social Work & Community Development': [
    'Social Work',
    'Community Development',
  ],
  'College of Teacher Education': [
    'Elementary Education',
    'Secondary Education',
    'Early Childhood Education',
    'Special Needs Education',
  ],
  "Professional Science Master's Program": [
    'Applied Mathematics',
    'Environmental Science',
    'Food Science',
  ],
};

export const getDepartmentsForCollege = (college: string): string[] => {
  return COLLEGE_DEPARTMENTS[college] ?? [];
};
