import { UserProfile, ExperienceItem, EducationItem, SkillCategory, ConferenceItem, InstitutionHighlight, PastimeItem } from '../types/portfolio';
import blueBoardAtmega from '../assets/images/pastime_blueboard_atmega.jpg';
import blueBoardLpc2148 from '../assets/images/pastime_blueboard_lpc2148.jpg';
import gpsReceiver from '../assets/images/pastime_gps_receiver.jpg';
import triaxialAccelerometer from '../assets/images/pastime_triaxial_accelerometer.jpg';

export const initialProfile: UserProfile = {
  name: "Phaneendra Paluri",
  pronouns: "he/him",
  role: "R&D Principal Engineer · Virtual Prototyping",
  location: "Bangalore, Karnataka, India",
  localTimezone: "Asia/Kolkata",
  availability: "Open to Staff/Principal Roles & Technical Advisory",
  bio: "Virtual prototyping developer with experience across processor architectures, processor development, functional modelling, architectural exploration, and verification tooling for CPU verification.",
  phone: "+91 888 409 8848",
  email: "pvs.myworks@gmail.com",
  github: "https://github.com",
  linkedin: "https://www.linkedin.com/in/pvsphaneendra",
  twitter: "https://x.com",
  expertiseHighlights: [
    { label: "Functional Modelling", value: "IP & CPU Models", context: "IP modelling · instruction-accurate CPU models" },
    { label: "Architectural Modelling", value: "CPU & SoC", context: "Cache, interconnect and system-level design exploration" },
    { label: "Modelling Frameworks", value: "SystemC / TLM-2", context: "Also CSTML, Imperas and Virtualizer" },
    { label: "CPU Architectures", value: "4 Architectures", context: "SPARC v8 · ARMv8 · RISC-V · Renesas V850" },
    { label: "Instruction Stream Generation", value: "ISG", context: "CPU-verification stimulus generation; developed a SPARC v8 tool" },
    { label: "High-Level Synthesis", value: "HLS", context: "Synthesizable SystemC; AXI4 and OCP-IP design exploration" },
    { label: "SystemC-CCI Working Group", value: "Standards Work", context: "Working-group contributions, examples and presentations" },
    { label: "SystemC-AMS", value: "AMS Modelling", context: "Know-how in modelling heterogeneous systems" }
  ]
};

export const experiences: ExperienceItem[] = [
  {
    id: "exp-synopsys",
    company: "Synopsys India Pvt. Ltd.",
    location: "Bangalore (hybrid), Karnataka",
    roles: [{ title: "R&D Principal Engineer", period: "Jul 2024 – Present" }],
    categories: [
      {
        title: "Processor architecture & development",
        details: [
          "Worked across RISC-V and Renesas V850 architectures, including floating-point and extensible floating-point capabilities.",
          "Developed processor cores using the Imperas framework and worked across RISC-V families including MIPS, Tenstorrent and SiFive."
        ]
      },
      {
        title: "Platform bring-up & demonstrations",
        details: [
          "Worked with RISC-V interrupt and platform components: CLINT, PLIC, ACLINT and APLIC.",
          "Brought up Linux on supported cores and enabled a feature-rich RISC-V starting-point VDK for demonstrations."
        ]
      }
    ]
  },
  {
    id: "exp-vayavya",
    company: "Vayavya Labs Pvt. Ltd.",
    location: "Fully remote · Phillipsburg, New Jersey, USA",
    roles: [{ title: "Consultant – Architect (Contract)", period: "Mar 2023 – Feb 2025" }],
    categories: [
      {
        title: "Functional models & peripheral systems",
        details: [
          "Developed functional models for peripheral and memory DMAs, SENT controllers and sensors, and I/O gate drivers."
        ]
      },
      {
        title: "Memory architecture",
        details: ["Studied LPDDR6 and submitted a design plan."]
      }
    ]
  },
  {
    id: "exp-infineon",
    company: "Infineon Technologies",
    location: "Bangalore, India",
    roles: [{ title: "Senior Staff Engineer", period: "Jul 2016 – Jan 2023" }],
    categories: [
      {
        title: "Processor & SoC development",
        details: [
          "Developed an ARMv8-based custom security processor using modern C++, SystemC and TLM-2.",
          "Worked on clock and power modules, I/O communication IPs, cryptographic variations, NVM, RAM, ROM and custom peripherals."
        ]
      },
      {
        title: "Simulator, debugger & SDK integration",
        details: [
          "Developed debugger back ends connecting simulators with Keil, GCC/GDB and Lauterbach IDEs.",
          "Integrated firmware, flash-memory, contact-based and contactless libraries, RF libraries and other SDK components."
        ]
      },
      {
        title: "Verification & quality",
        details: [
          "Created test strategies spanning unit, component, IP, subsystem, data-flow, platform, emulation and DV levels."
        ]
      },
      {
        title: "Platform generation & delivery",
        details: [
          "Designed flexible platform-system generation for devices and integrated components into the SDK.",
          "Worked with regression CI/CD tooling including CMake, Conan, JFrog Artifactory, Jenkins multibranch pipelines and Groovy.",
          "Mentored new joiners and drove multiple ideas through to completion."
        ]
      }
    ]
  },
  {
    id: "exp-test-verification",
    company: "Test and Verification Solutions",
    location: "Boras, Sweden · San Jose, USA · Bengaluru, India",
    roles: [{ title: "Senior Engineer", period: "Oct 2014 – Mar 2016" }],
    categories: [
      {
        title: "CPU verification tooling · Sweden",
        details: [
          "Sole developer of a SPARC v8 Instruction Stream Generator: prototyped, designed, implemented and deployed the tool."
        ]
      },
      {
        title: "Architectural exploration · USA",
        details: [
          "Worked with architects at LGE Labs on a next-generation system-level cache controller linking CPUs and NoCs with LPDDR4/5 memory."
        ]
      },
      {
        title: "Frameworks & subsystem integration · India",
        details: [
          "Proposed client-side standards and processes, reusable register-model and testbench frameworks, and the build environment.",
          "Worked with AXI4 and APB and integrated IPs into the subsystem."
        ]
      }
    ]
  },
  {
    id: "exp-circuitsutra",
    company: "CircuitSutra Technologies Pvt. Ltd.",
    location: "Bangalore, Karnataka",
    roles: [{ title: "Member of Technical Staff", period: "Mar 2011 – Sep 2014" }],
    categories: [
      {
        title: "SystemC / TLM-2 & virtual prototyping",
        details: [
          "Developed untimed, functional and approximately-timed models for CSTML library components, plus convenience sockets and Quick-Start Packages.",
          "Worked with QEMU Monitor Protocol in a QEMU–SystemC–Python project and standardized release branches."
        ]
      },
      {
        title: "IP generators & design automation",
        details: [
          "Built a Python IP Model Generator and spreadsheet-based design datasheet workflow.",
          "Generated interface wrappers, cores, register files, build scripts, testbenches and test files."
        ]
      },
      {
        title: "OMAP6 Imaging Sub-System · customer site",
        details: [
          "Developed 10+ C/C++ video-engine IPs for the OMAP6 Imaging Sub-System, mapping reference video algorithms to IP interfaces.",
          "Brought up the simulator, configured register views and CPU artefacts, and tested at unit, integration, scenario, regression and DV levels.",
          "Supported the full software lifecycle: feature extraction, development, testing, documentation, bug tracking and fixes, and support for the software team.",
          "Prepared release notes and Windows/Linux packages and handled IP-XACT, BitWise and release communications."
        ]
      },
      {
        title: "Protocols, AMS & standards",
        details: [
          "Implemented a Common Bus Architecture SystemC-TLM-2 adaptor across TL4, TL3, TL1 and TL0 abstraction levels.",
          "Developed SystemC-AMS components and synthesizable AXI4/OCP-IP protocol proofs of concept, exploring power, area and timing.",
          "Contributed to the Accellera CCI Working Group, developed 14 examples and presentations, and presented at DVCON, NASCUG and ISCUG."
        ]
      }
    ]
  },
  {
    id: "exp-hitech",
    company: "HiTech Robotic Systemz Limited",
    location: "Gurgaon, Haryana",
    roles: [
      { title: "Research Developer", period: "Jul 2010 – Mar 2011" },
      { title: "Graduate Engineer Trainee", period: "Jul 2009 – Jun 2010" }
    ],
    categories: [
      {
        title: "Robotics & defence systems",
        details: [
          "Contributed to one-, two- and four-wheeled robots for audio/video surveillance and the communication subsystem for BMP tele-operation.",
          "Explored defence requirements, EMI/EMC, wireless-planning guidelines, RF link budgets and ITU-BT.656."
        ]
      },
      {
        title: "Embedded systems & imaging",
        details: [
          "Refined VHDL for camera-to-TFT video and developed UART, SPI, character-LCD and I2C libraries for ATmel and ARM7TDMI-S boards.",
          "Built audio/video and imaging applications with OpenCV, FFMPEG and LibVLC, including resize, crop, zoom, enhancement, noise-filtering, motion-capture and panorama features.",
          "Worked across embedded controls, machine and computer vision, AI and robotics teams."
        ]
      }
    ]
  }
];

export const educations: EducationItem[] = [
  {
    id: "edu-1",
    degree: "Master of Technology (M.Tech)",
    institution: "Indian Institute of Technology Roorkee",
    period: "Class of 2009",
    location: "India",
    honors: "System Engineering and Operations Research · CGPA 8.11/10",
    details: [
      "Department of Electrical Engineering",
      "Dissertation: Closed-Loop OFDM Systems"
    ]
  },
  {
    id: "edu-2",
    degree: "Bachelor of Technology (B.Tech)",
    institution: "C V R College of Engineering",
    period: "Class of 2007",
    location: "India",
    honors: "Electronics and Communications Engineering · 78.09%",
    details: []
  }
];

export const skillCategories: SkillCategory[] = [
  {
    id: "cat-processors",
    title: "SoC & Processor Modelling",
    skills: [
      { name: "Processor and CPU fast models", description: "Custom processor development, functional models, simulator integration and debugger back ends." },
      { name: "SystemC & TLM-2", description: "SoC modules, peripheral models and transaction-level models across abstraction levels." },
      { name: "Virtual prototyping", description: "Full-SoC integration, platform generation, VDK enablement and Linux bring-up." }
    ]
  },
  {
    id: "cat-modeling",
    title: "Architecture & Verification",
    skills: [
      { name: "CPU architectures", description: "SPARC v8, ARMv8, RISC-V and Renesas V850; cache and interconnect architectural exploration." },
      { name: "Verification tooling", description: "Instruction Stream Generation, debugger tooling and tests from unit through platform and DV." },
      { name: "Bus protocols", description: "AXI4, OCP-IP, APB and Common Bus Architecture; synthesizable SystemC exploration." }
    ]
  },
  {
    id: "cat-standards",
    title: "Standards & Cross-disciplinary Systems",
    skills: [
      { name: "Accellera CCI", description: "Working-group contributions, 14 user examples and presentations, and conference participation." },
      { name: "Embedded systems & controls", description: "Firmware, real-time control systems and defence/commercial robotics." },
      { name: "Computer vision", description: "Audio/video processing and imaging pipelines using OpenCV, FFMPEG and LibVLC." }
    ]
  }
];

export const careerSummary = [
  "Virtual prototyping developer experienced in processor architectures, processor development, functional modelling, architectural exploration and verification tooling for CPU verification.",
  "Work spans SoC and processor modelling, SystemC/TLM-2, debugger and simulator integration, CPU verification, and embedded systems and robotics."
];

export const domainsOfInterest = [
  "SoC & processor modelling",
  "CPU architectures & verification",
  "SystemC / TLM-2",
  "Embedded systems, robotics & computer vision"
];

export const conferenceParticipations: ConferenceItem[] = [
  {
    id: "conference-dvcon-2014",
    event: "DVCON India",
    year: "2014",
    contribution: "Tutorial: SystemC-AMS based methodologies for the design and verification of heterogeneous systems",
    session: "Overview of SystemC-AMS",
    link: "https://dvcon-india.org/sites/dvcon-india.org/files/archive/2014/2014_Conference_Program.pdf"
  },
  {
    id: "conference-nascug-2013",
    event: "NASCUG",
    year: "2013",
    contribution: "Co-author, “AXI4 Protocol Development Using HLS Tool”"
  },
  {
    id: "conference-iscug-2012",
    event: "ISCUG",
    year: "2012",
    contribution: "Tutorial: The New SystemC Standard — IEEE 1666-2011",
    session: "Speaker: Accellera SystemC-CCI Working Group Updates",
    link: "https://www.iscug.net/2012-agenda"
  }
];

export const institutionHighlights: InstitutionHighlight[] = [
  {
    id: "isro",
    name: "Indian Space Research Organisation",
    context: "Cleared the ISRO panel interview and received a job offer for Scientist-B in August 2007.",
    link: "https://www.isro.gov.in/",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Indian_Space_Research_Organisation_Logo.svg/330px-Indian_Space_Research_Organisation_Logo.svg.png"
  },
  {
    id: "iitr",
    name: "Indian Institute of Technology Roorkee",
    context: "M.Tech in Electrical Engineering, specializing in System Engineering and Operations Research · Class of 2009.",
    link: "https://www.iitr.ac.in/",
    logo: "https://cmsredesign.channeli.in/library/assets/images/iitrLogo.png"
  }
];

export const pastimes: PastimeItem[] = [
  {
    id: "blueboard-atmega",
    name: "BlueBoard ATMega Board",
    image: blueBoardAtmega,
    imageAlt: "BlueBoard ATMega development board"
  },
  {
    id: "blueboard-lpc2148",
    name: "BlueBoard LPC2148 Board",
    image: blueBoardLpc2148,
    imageAlt: "BlueBoard LPC2148 development board"
  },
  {
    id: "triaxial-accelerometer",
    name: "Tri-axial Accelerometer",
    image: triaxialAccelerometer,
    imageAlt: "Tri-axial accelerometer module"
  },
  {
    id: "gps-receiver",
    name: "GPS Receiver Module",
    image: gpsReceiver,
    imageAlt: "GPS receiver module"
  }
];
