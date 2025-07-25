export interface Position {
  position: string;
  overridePosition?: string | null;
  departments: string[];
  aliases: string[];
}

export const defaultPositionRules: Position[] = [
  {
    position: "1st Assistant Accountant",
    aliases: ["First Assistant Accountant", "1st Assistant Accountant"],
    departments: ["Accounting"],
  },
  {
    position: "2nd Assistant Accountant",
    aliases: ["Second Assistant Accountant", "2nd Assistant Accountant"],
    departments: ["Accounting"],
  },
  {
    position: "Accounting Clerk",
    aliases: [],
    departments: ["Accounting"],
  },
  {
    position: "Payroll Accountant",
    aliases: [],
    departments: ["Accounting"],
  },
  {
    position: "Production Accountant",
    aliases: [],
    departments: ["Accounting"],
  },
  {
    position: "Account Director",
    aliases: [],
    departments: ["Agency"],
  },
  {
    position: "Account Executive",
    aliases: [],
    departments: ["Agency"],
  },
  {
    position: "Account Manager",
    aliases: [],
    departments: ["Agency"],
  },
  {
    position: "Account Supervisor",
    aliases: [],
    departments: ["Agency"],
  },
  {
    position: "Associate Creative Director",
    aliases: ["ACD"],
    departments: ["Agency"],
  },
  {
    position: "Copywriter",
    aliases: [],
    departments: ["Agency"],
  },
  {
    position: "Creative Director",
    aliases: ["CD"],
    departments: ["Agency"],
  },
  {
    position: "Animal Wrangler",
    aliases: [],
    departments: ["Animal Wranglers"],
  },
  {
    position: "Animal Wrangler Assistant",
    aliases: [],
    departments: ["Animal Wranglers"],
  },
  {
    position: "Animal Trainer",
    aliases: ["Animal Handler"],
    departments: ["Animals"],
  },
  {
    position: "3D Computer Animator",
    aliases: ["CGI Animator", "3D Animator", "CG Animator"],
    departments: ["Animation"],
  },
  {
    position: "Animation Supervisor",
    aliases: ["CG Supervisor"],
    departments: ["Animation"],
  },
  {
    position: "Animator",
    aliases: ["Character Animator", "CG Animator"],
    departments: ["Animation"],
  },
  {
    position: "Character Designer",
    aliases: ["Concept Artist"],
    departments: ["Animation"],
  },
  {
    position: "Lighting Artist",
    aliases: ["CG Lighting Artist"],
    departments: ["Animation"],
  },
  {
    position: "Rendering Technician",
    aliases: ["Render Wrangler"],
    departments: ["Animation"],
  },
  {
    position: "Rigging Artist",
    aliases: ["Character TD", "Creature TD"],
    departments: ["Animation"],
  },
  {
    position: "Art Assistant",
    aliases: ["Art PA"],
    departments: ["Art Department"],
  },
  {
    position: "Art Coordinator",
    aliases: ["Art Department Coordinator"],
    departments: ["Art Department"],
  },
  {
    position: "Art Department Assistant",
    aliases: ["Art Assistant", "Art PA"],
    departments: ["Art Department"],
  },
  {
    position: "Art Director",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Art PA",
    aliases: ["Art Runner"],
    departments: ["Art Department"],
  },
  {
    position: "Assistant Art Director",
    aliases: ["Asst. Art Director"],
    departments: ["Art Department"],
  },
  {
    position: "Assistant Food Stylist",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Assistant Prop Master",
    aliases: ["Assistant Props"],
    departments: ["Art Department"],
  },
  {
    position: "Concept Artist",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Food Stylist",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Graphic Designer",
    aliases: ["Title Designer"],
    departments: ["Art Department"],
  },
  {
    position: "Greensman",
    aliases: ["Greens"],
    departments: ["Art Department"],
  },
  {
    position: "Illustrator",
    aliases: ["Storyboard Artist"],
    departments: ["Art Department"],
  },
  {
    position: "Lead Man",
    aliases: ["Leadman"],
    departments: ["Art Department"],
  },
  {
    position: "On-Set Dresser",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Production Designer",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Prop Master",
    aliases: ["Property Master"],
    departments: ["Art Department"],
  },
  {
    position: "Property Master",
    aliases: ["Props Master", "Prop Master"],
    departments: ["Art Department"],
  },
  {
    position: "Set Decorator",
    aliases: ["Leadman"],
    departments: ["Art Department"],
  },
  {
    position: "Set Dresser",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Storyboard Artist",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Supervising Art Director",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Swing",
    aliases: ["Swing Gang"],
    departments: ["Art Department"],
  },
  {
    position: "Art Department Coordinator",
    aliases: ["ADC"],
    departments: ["Art Department"],
  },
  {
    position: "Art Dept Production Assistant",
    aliases: ["Art Department PA"],
    departments: ["Art Department"],
  },
  {
    position: "Art Director",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Graphic Designer",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Production Designer",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "Set Designer",
    aliases: [],
    departments: ["Art Department"],
  },
  {
    position: "1st Assistant Director",
    aliases: ["First AD", "1st AD", "First Assistant Director", "AD"],
    departments: ["Assistant Directors"],
  },
  {
    position: "2nd 2nd Assistant Director",
    aliases: [
      "Second Second AD",
      "2nd Second AD",
      "Second 2nd Assistant Director",
      "AD",
    ],
    departments: ["Assistant Directors"],
  },
  {
    position: "2nd Assistant Director",
    aliases: ["Second AD", "2nd AD", "Second Assistant Director", "AD"],
    departments: ["Assistant Directors"],
  },
  {
    position: "Key 2nd Assistant Director",
    aliases: [
      "Key Second AD",
      "Key 2nd AD",
      "Key Second Assistant Director",
      "AD",
    ],
    departments: ["Assistant Directors"],
  },
  {
    position: "Key Set Production Assistant",
    aliases: ["Key Set PA"],
    departments: ["Assistant Directors"],
  },
  {
    position: "Set Production Assistant",
    aliases: ["Set PA"],
    departments: ["Assistant Directors"],
  },
  {
    position: "1st AC",
    aliases: [
      "1st Assistant Camera",
      "Focus Puller",
      "1st Assistant Camera A",
      "First AC A",
      "Focus Puller A",
      "1st Assistant Camera B",
      "First AC B",
      "Focus Puller B",
      "First Assistant Camera",
      "First Assistant Camera A",
      "1st AC A",
      "First Assistant Camera B",
      "1st AC B",
      "First AC",
    ],
    departments: ["Camera"],
  },
  {
    position: "2nd AC",
    aliases: [
      "2nd Assistant Camera",
      "Clapper Loader",
      "Second Assistant Camera",
      "2nd Assistant Camera A",
      "2nd Assistant Camera B",
      "Second AC A",
      "Clapper Loader A",
      "Second AC B",
      "Clapper Loader B",
      "Second Assistant Camera A",
      "2nd Assistant Camera B",
      "2nd AC A",
      "Clapper Loader A",
      "2nd AC B",
      "Second Assistant Camera A",
      "Second Assistant Camera B",
      "2nd Assistant Camera A",
      "Second Assistant Camera B",
      "Second AC",
    ],
    departments: ["Camera"],
  },
  {
    position: "AC",
    aliases: ["Assistant Camera", "Camera Assistant"],
    departments: ["Camera"],
  },
  {
    position: "Camera Operator",
    aliases: [
      "Cameraman",
      "Cameraperson",
      "CO",
      "Camera Op",
      "Camera Operator B",
      "Cam Op B",
      "Camera Operator A",
      "Cam Op A",
      "Cam Op",
    ],
    departments: ["Camera"],
  },
  {
    position: "Crane Operator",
    aliases: [],
    departments: ["Camera"],
  },
  {
    position: "Data Wrangler",
    aliases: ["Data Management Technician"],
    departments: ["Camera"],
  },
  {
    position: "Digital Imaging Technician",
    aliases: ["Data Wrangler", "Digital Utility", "DIT"],
    departments: ["Camera"],
  },
  {
    position: "Director of Photography",
    aliases: [
      "Director of Photography",
      "DP",
      "Cinematographer",
      "DoP",
      "DOP",
      "Dir. of Photography",
    ],
    departments: ["Camera"],
  },
  {
    position: "Drone Operator",
    aliases: ["Drone Pilot", "UAV Pilot"],
    departments: ["Camera"],
  },
  {
    position: "Steadicam Operator",
    aliases: ["Steadicam Op"],
    departments: ["Camera"],
  },
  {
    position: "Stills Photographer",
    aliases: ["Unit Photographer", "Still Photographer"],
    departments: ["Camera"],
  },
  {
    position: "Teleprompter Operator",
    aliases: ["Teleprompter Op"],
    departments: ["Camera"],
  },
  {
    position: "Video Assist Assistant",
    aliases: ["Video Assist PA"],
    departments: ["Camera"],
  },
  {
    position: "Video Assist Operator",
    aliases: ["VAO"],
    departments: ["Camera"],
  },
  {
    position: "VTR Operator",
    aliases: ["Video Assist", "Video Playback Operator"],
    departments: ["Camera"],
  },
  {
    position: "Talent",
    aliases: ["Actor", "Actress", "Performer"],
    departments: ["Cast"],
  },
  {
    position: "ADR Voice Casting",
    aliases: ["Automatic Dialogue Replacement Casting"],
    departments: ["Casting"],
  },
  {
    position: "Casting Assistant",
    aliases: [],
    departments: ["Casting"],
  },
  {
    position: "Casting Associate",
    aliases: [],
    departments: ["Casting"],
  },
  {
    position: "Casting Director",
    aliases: [],
    departments: ["Casting"],
  },
  {
    position: "Extras Casting Assistant",
    aliases: [],
    departments: ["Casting"],
  },
  {
    position: "Extras Casting Associate",
    aliases: [],
    departments: ["Casting"],
  },
  {
    position: "Extras Casting Director",
    aliases: [],
    departments: ["Casting"],
  },
  {
    position: "Extras Wrangler",
    aliases: ["Extras Coordinator"],
    departments: ["Casting"],
  },
  {
    position: "Caterer",
    aliases: [],
    departments: ["Catering"],
  },
  {
    position: "Catering",
    aliases: ["Craft Services"],
    departments: ["Catering"],
  },
  {
    position: "Colorist",
    aliases: [
      "Color Correction Artist",
      "Color Grading Artist",
      "Digital Intermediate Artist",
    ],
    departments: ["Color"],
  },
  {
    position: "Digital Intermediate Producer",
    aliases: ["DI Producer"],
    departments: ["Color"],
  },
  {
    position: "Carpenter",
    aliases: ["Set Carpenter"],
    departments: ["Construction"],
  },
  {
    position: "Construction Buyer",
    aliases: [],
    departments: ["Construction"],
  },
  {
    position: "Construction Coordinator",
    aliases: [],
    departments: ["Construction"],
  },
  {
    position: "Construction Foreman",
    aliases: [],
    departments: ["Construction"],
  },
  {
    position: "Greensman",
    aliases: [],
    departments: ["Construction"],
  },
  {
    position: "Head Scenic Painter",
    aliases: ["Chief Scenic Artist"],
    departments: ["Construction"],
  },
  {
    position: "Lead Greensman",
    aliases: ["Chief Greensman"],
    departments: ["Construction"],
  },
  {
    position: "Painter",
    aliases: ["Scenic Artist"],
    departments: ["Construction"],
  },
  {
    position: "1st Assistant Costumer",
    aliases: ["First Assistant Costumer"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "2nd Assistant Costumer",
    aliases: ["2nd Costumer", "Second Costumer", "Second Assistant Costumer"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Assistant Costume Designer",
    aliases: ["Asst. Costume Designer"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Assistant Costumer",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Assistant Stylist",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Costume Coordinator",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Costume Designer",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Costumer",
    aliases: ["Costume Assistant", "Assistant Wardrobe"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Key Costumer",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "On Set Costumer",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Seamstress/Tailor",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Stylist",
    aliases: ["Costume Stylist", "Wardrobe Stylist"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Tailor",
    aliases: ["Seamstress", "Stitcher"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Wardrobe Buyer",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Wardrobe Prod Assistant",
    aliases: ["Wardrobe PA"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Wardrobe Stylist",
    aliases: ["Costume Stylist", "Stylist"],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Wardrobe Supervisor",
    aliases: [],
    departments: ["Costume / Wardrobe"],
  },
  {
    position: "Assistant Craft Services",
    aliases: [],
    departments: ["Craft Services"],
  },
  {
    position: "Catering",
    aliases: ["Craft Service", "Craft Services", "Crafty"],
    departments: ["Craft Services"],
  },
  {
    position: "Craft Service",
    aliases: ["Crafty", "Catering", "Craft Services"],
    departments: ["Craft Services"],
  },
  {
    position: "Digital Dailies Technician",
    aliases: ["Dailies Operator", "Digital Loader"],
    departments: ["Dailies"],
  },
  {
    position: "Encoding Specialist",
    aliases: ["Compression Specialist", "Transcoding Specialist"],
    departments: ["Deliverables"],
  },
  {
    position: "Digital Cinema Content Manager",
    aliases: [],
    departments: ["Digital Cinema"],
  },
  {
    position: "1st AD",
    aliases: [
      "AD",
      "Assistant Director",
      "1st AD",
      "1st Assistant Director",
      "First Assistant Director",
      "First AD",
    ],
    departments: ["Directing"],
  },
  {
    position: "2nd AD",
    aliases: [
      "2nd Assistant Director",
      "2nd AD",
      "Second Assistant Director",
      "Second AD",
    ],
    departments: ["Directing"],
  },
  {
    position: "Director",
    aliases: ["Film Director", "Episode Director"],
    departments: ["Directing"],
  },
  {
    position: "Second Unit Director",
    aliases: ["2nd Unit Director", "Second Unit Director"],
    departments: ["Directing"],
  },
  {
    position: "Assistant Editor",
    aliases: ["Asst. Editor", "Editing Assistant"],
    departments: ["Editorial"],
  },
  {
    position: "Editor",
    aliases: ["Film Editor"],
    departments: ["Editorial"],
  },
  {
    position: "Editorial Producer",
    aliases: ["Post-Production Supervisor"],
    departments: ["Editorial"],
  },
  {
    position: "Lead Editor",
    aliases: ["Chief Editor"],
    departments: ["Editorial"],
  },
  {
    position: "Technical Director (TD)",
    aliases: ["Vision Mixer (UK)"],
    departments: ["Editorial"],
  },
  {
    position: "Best Boy Electric",
    aliases: [
      "BBE",
      "Best Boy",
      "BB Electric",
      "Assistant Chief Lighting Technician",
    ],
    departments: ["Electric"],
  },
  {
    position: "Lighting Technician",
    aliases: [
      "Lighting",
      "Lighting Tech",
      "Lighting Crew",
      "Lighting Department",
      "Lighting Assistant"
    ],
    departments: ["Electric"],
  },
  {
    position: "Lighting Manager",
    aliases: [
      "Lighting Dept Manager",
      "Lighting Supervisor"
    ],
    departments: ["Electric"],
  },
  {
    position: "Lighting Designer",
    aliases: ["LD", "Lighting Design"],
    departments: ["Electric"],
  },
  {
    position: "Electric",
    aliases: [
      "Electrician",
      "Lamp Operator",
      "Lighting Technician",
      "3rd Electrician",
      "4th Electrician",
      "3rd Electric",
      "4th Electric",
      "Third Electrician",
      "Third Electric",
    ],
    departments: ["Electric"],
  },
  {
    position: "Gaffer",
    aliases: ["Chief Lighting Technician", "Gaffer/Electric"],
    departments: ["Electric"],
  },
  {
    position: "Rigging Best Boy Electrician",
    aliases: ["Rigging Assistant Chief Lighting Technician"],
    departments: ["Electric"],
  },
  {
    position: "Rigging Electrician",
    aliases: ["Rigging Lighting Technician"],
    departments: ["Electric"],
  },
  {
    position: "Rigging Gaffer",
    aliases: ["Rigging Chief Lighting Technician"],
    departments: ["Electric"],
  },
  {
    position: "Title Designer",
    aliases: ["Caption Designer", "Broadcast Designer", "Graphic Designer"],
    departments: ["Graphics"],
  },
  {
    position: "Best Boy Grip",
    aliases: ["BBG", "Best Boy", "BB Grip", "Assistant Key Grip"],
    departments: ["Grip"],
  },
  {
    position: "Dolly Grip",
    aliases: [],
    departments: ["Grip"],
  },
  {
    position: "Grip",
    aliases: [
      "Lighting and Rigging Technician",
      "3rd Grip",
      "4th Grip",
      "5th Grip",
      "Lighting & Rigging Technician",
      "Third Grip",
    ],
    departments: ["Grip"],
  },
  {
    position: "Grip/Driver",
    aliases: [],
    departments: ["Grip"],
  },
  {
    position: "Key Grip",
    aliases: ["Chief Grip"],
    departments: ["Grip"],
  },
  {
    position: "Rigging Best Boy Grip",
    aliases: ["Rigging Assistant Chief Grip"],
    departments: ["Grip"],
  },
  {
    position: "Rigging Grip",
    aliases: [
      "Rigging Lighting and Rigging Technician",
      "Rigging Lighting & Rigging Technician",
    ],
    departments: ["Grip"],
  },
  {
    position: "Rigging Key Grip",
    aliases: ["Rigging Chief Grip"],
    departments: ["Grip"],
  },
  {
    position: "2nd Makeup",
    aliases: ["Second Makeup"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Hair Stylist",
    aliases: [],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Assistant Hair Stylist",
    aliases: ["Asst. Hair Stylist"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Assistant Hair/Makeup",
    aliases: [],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Assistant Makeup",
    aliases: [],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Assistant Makeup Artist",
    aliases: ["Asst. Makeup Artist"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Hair/Makeup Assistant",
    aliases: ["Assistant Hair Stylist", "Assistant Makeup Artist"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Key Hair",
    aliases: ["Key Hairstylist", "Key Hair Stylist"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Key Makeup Artist",
    aliases: ["Key Makeup Artist", "Key Makeup", "Key MUA"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Makeup Artist",
    aliases: ["MUA"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "COVID Compliance Officer",
    aliases: ["CCO"],
    departments: ["Health & Safety"],
  },
  {
    position: "Health & Safety Assistant",
    aliases: ["H&S Assistant", "Health and Safety Assistant"],
    departments: ["Health & Safety"],
  },
  {
    position: "Health & Safety Coordinator",
    aliases: ["H&S Coordinator", "Health and Safety Coordinator"],
    departments: ["Health & Safety"],
  },
  {
    position: "Health & Safety Labor",
    aliases: ["H&S Laborer", "Health and Safety Labor"],
    departments: ["Health & Safety"],
  },
  {
    position: "Health & Safety Manager",
    aliases: ["H&S Manager", "Health and Safety Manager"],
    departments: ["Health & Safety"],
  },
  {
    position: "Health & Safety Supervisor",
    aliases: ["H&S Supervisor", "Health and Safety Supervisor"],
    departments: ["Health & Safety"],
  },
  {
    position: "Assistant Location Manager",
    aliases: ["Asst. Location Manager", "ALM"],
    departments: ["Locations"],
  },
  {
    position: "Honeywagon Driver",
    aliases: [],
    departments: ["Locations"],
  },
  {
    position: "Location Assistant",
    aliases: ["LA"],
    departments: ["Locations"],
  },
  {
    position: "Location Laborer",
    aliases: ["Location PA"],
    departments: ["Locations"],
  },
  {
    position: "Location Manager",
    aliases: ["Loc Manager", "Location Scout"],
    departments: ["Locations"],
  },
  {
    position: "Location Scout",
    aliases: [],
    departments: ["Locations"],
  },
  {
    position: "Hair & Makeup Stylist",
    aliases: ["H&M stylist"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Assistant Hairstylist",
    aliases: ["Hair PA"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Assistant Makeup Artist",
    aliases: ["Makeup PA"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Hairstylist",
    aliases: [],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Key Hairstylist",
    aliases: ["Chief Hairstylist"],
    departments: ["Hair & Makeup"],
  },
  {
    position: "Choreographer",
    aliases: ["Dance Choreographer"],
    departments: ["Miscellaneous"],
  },
  {
    position: "Consultant",
    aliases: ["Technical Advisor", "Subject Matter Expert"],
    departments: ["Miscellaneous"],
  },
  {
    position: "Craft Service",
    aliases: ["Crafty"],
    departments: ["Miscellaneous"],
  },
  {
    position: "Creative Consultant",
    aliases: [],
    departments: ["Miscellaneous"],
  },
  {
    position: "Creative Director",
    aliases: [],
    departments: ["Miscellaneous"],
  },
  {
    position: "Production Accountant",
    aliases: [],
    departments: ["Miscellaneous"],
  },
  {
    position: "Production Coordinator",
    aliases: ["PC"],
    departments: ["Miscellaneous"],
  },
  {
    position: "Publicist",
    aliases: ["Unit Publicist"],
    departments: ["Miscellaneous"],
  },
  {
    position: "Researcher",
    aliases: [],
    departments: ["Miscellaneous"],
  },
  {
    position: "Stage Manager",
    aliases: [],
    departments: ["Miscellaneous"],
  },
  {
    position: "Technical Director",
    aliases: ["TD", "Vision Mixer (UK)"],
    departments: ["Miscellaneous"],
  },
  {
    position: "Composer",
    aliases: ["Film Composer", "Score Composer"],
    departments: ["Music"],
  },
  {
    position: "Music Coordinator",
    aliases: [],
    departments: ["Music"],
  },
  {
    position: "Music Editor",
    aliases: [],
    departments: ["Music"],
  },
  {
    position: "Music Supervisor",
    aliases: [],
    departments: ["Music"],
  },
  {
    position: "Musical Director",
    aliases: ["Music Director"],
    departments: ["Music"],
  },
  {
    position: "Optical Technician",
    aliases: [],
    departments: ["Opticals"],
  },
  {
    position: "Driver/Mechanic",
    aliases: [],
    departments: ["Picture Cars"],
  },
  {
    position: "Picture Car Assistant",
    aliases: ["Picture Car PA"],
    departments: ["Picture Cars"],
  },
  {
    position: "Picture Car Coordinator",
    aliases: [],
    departments: ["Picture Cars"],
  },
  {
    position: "Post Production Supervisor",
    aliases: ["Post Supervisor"],
    departments: ["Post"],
  },
  {
    position: "Post Production Coordinator",
    aliases: ["Post Coord"],
    departments: ["Post Production"],
  },
  {
    position: "Post Production Prod Assistant",
    aliases: ["Post PA"],
    departments: ["Post Production"],
  },
  {
    position: "Colorist",
    aliases: ["Digital Colorist", "Color Timer"],
    departments: ["Post-Production"],
  },
  {
    position: "Online Editor",
    aliases: [],
    departments: ["Post-Production"],
  },
  {
    position: "Post Producer",
    aliases: [],
    departments: ["Post-Production"],
  },
  {
    position: "Executive Producer",
    aliases: ["Exec. Producer", "EP"],
    departments: ["Production"],
  },
  {
    position: "Assistant",
    aliases: ["Production Assistant"],
    departments: ["Production"],
  },
  {
    position: "Assistant Production Coordinator",
    aliases: ["Asst. Production Coordinator"],
    departments: ["Production"],
  },
  {
    position: "Assistant Production Coordinator",
    aliases: ["APC"],
    departments: ["Production"],
  },
  {
    position: "Assistant Production Supervisor",
    aliases: ["Asst. Production Supervisor"],
    departments: ["Production"],
  },
  {
    position: "Associate Producer",
    aliases: ["AP"],
    departments: ["Production"],
  },
  {
    position: "IT Tech",
    aliases: ["Information Technology Technician"],
    departments: ["Production"],
  },
  {
    position: "Key Office Production Assistant",
    aliases: [],
    departments: ["Production"],
  },
  {
    position: "Line Producer",
    aliases: ["Unit Production Manager"],
    departments: ["Production"],
  },
  {
    position: "Office Production Assistant",
    aliases: ["OPA"],
    departments: ["Production"],
  },
  {
    position: "Post-Production Manager",
    aliases: [],
    departments: ["Production"],
  },
  {
    position: "Producer",
    aliases: [],
    departments: ["Production"],
  },
  {
    position: "Production Assistant",
    aliases: ["PA"],
    departments: ["Production"],
  },
  {
    position: "Production Coordinator",
    aliases: ["PC"],
    departments: ["Production"],
  },
  {
    position: "Production Secretary",
    aliases: [],
    departments: ["Production"],
  },
  {
    position: "Production Supervisor",
    aliases: [],
    departments: ["Production"],
  },
  {
    position: "Set Production Assistant",
    aliases: ["Set PA"],
    departments: ["Production"],
  },
  {
    position: "Travel Coordinator",
    aliases: [],
    departments: ["Production"],
  },
  {
    position: "Unit Production Manager",
    aliases: ["UPM", "Production Manager", "Line Producer"],
    departments: ["Production"],
  },
  {
    position: "Digital Projection Technician",
    aliases: ["Screening Room Technician"],
    departments: ["Projection"],
  },
  {
    position: "Assistant Prop Master",
    aliases: ["Assistant Property Master"],
    departments: ["Property"],
  },
  {
    position: "Prop Maker",
    aliases: [],
    departments: ["Property"],
  },
  {
    position: "Prop Master",
    aliases: ["Property Master"],
    departments: ["Property"],
  },
  {
    position: "Props Assistant",
    aliases: ["Props PA"],
    departments: ["Property"],
  },
  {
    position: "Props Buyer",
    aliases: [],
    departments: ["Property"],
  },
  {
    position: "Props Office Coordinator",
    aliases: ["Props Coord"],
    departments: ["Property"],
  },
  {
    position: "2nd Props",
    aliases: ["Second Props"],
    departments: ["Props"],
  },
  {
    position: "Assistant Prop Master",
    aliases: ["Assistant Props", "Asst. Prop Master", "Prop Assistant"],
    departments: ["Props"],
  },
  {
    position: "Prop Master",
    aliases: ["Property Master"],
    departments: ["Props"],
  },
  {
    position: "Props",
    aliases: ["Property"],
    departments: ["Props"],
  },
  {
    position: "American Humane Rep",
    aliases: ["Animal Safety Representative"],
    departments: ["Safety"],
  },
  {
    position: "Medic",
    aliases: ["Set Medic", "First Aid", "1st Aid"],
    departments: ["Safety"],
  },
  {
    position: "Safety Officer",
    aliases: [],
    departments: ["Safety"],
  },
  {
    position: "Script Coordinator",
    aliases: [],
    departments: ["Script"],
  },
  {
    position: "Script Supervisor",
    aliases: ["Scripty"],
    departments: ["Script"],
  },
  {
    position: "Leadman",
    aliases: ["Lead Person"],
    departments: ["Set Decoration"],
  },
  {
    position: "On Set Dresser",
    aliases: ["Set Dressing Technician"],
    departments: ["Set Decoration"],
  },
  {
    position: "Set Dec Buyer",
    aliases: [],
    departments: ["Set Decoration"],
  },
  {
    position: "Set Dec Coordinator",
    aliases: ["SDC"],
    departments: ["Set Decoration"],
  },
  {
    position: "Set Decorator",
    aliases: [],
    departments: ["Set Decoration"],
  },
  {
    position: "Set Dresser",
    aliases: [],
    departments: ["Set Decoration"],
  },
  {
    position: "Swing",
    aliases: ["Swing Gang", "Swing Tech"],
    departments: ["Set Decoration"],
  },
  {
    position: "Boom Operator",
    aliases: [
      "Boom Op",
      "Boom Mic Operator",
      "Boom Mic",
      "Boom Tech"
    ],
    departments: ["Sound"],
  },
  {
    position: "Playback Operator",
    aliases: [
      "Playback Tech",
      "VTR Playback",
      "Playback",
      "Sound Playback"
    ],
    departments: ["Sound"],
  },
  {
    position: "Sound Mixer",
    aliases: [
      "Production Sound Mixer",
      "Location Sound Mixer",
      "Director of Audio",
      "Audio Lead"
    ],
    departments: ["Sound"],
  },
  {
    position: "Sound Utility",
    aliases: [
      "Utility Cable",
      "Utility Sound",
      "Cable Person",
      "Sound Assistant"
    ],
    departments: ["Sound"],
  },
  {
    position: "Rerecording Mixer",
    aliases: [
      "Dubbing Mixer",
      "Mix Engineer",
      "Re-Recording Mixer",
      "Post Sound Mixer"
    ],
    departments: ["Sound"],
  },
  {
    position: "Sound Designer",
    aliases: ["Audio Designer", "Post Sound Designer"],
    departments: ["Sound/Post"],
  },
  {
    position: "Foley Artist",
    aliases: ["Foley", "Foley Sound Artist"],
    departments: ["Sound"],
  },
  {
    position: "Sound Editor",
    aliases: [
      "Dialogue Editor",
      "Sound Editor",
      "Effects Editor",
      "Foley Editor",
      "Post Sound Editor"
    ],
    departments: ["Sound"],
  },
  {
    position: "Audio Technician",
    aliases: [
      "Audio",
      "A2",
      "Sound Tech",
      "Audio Tech",
      "Audio Engineer",
      "Field Audio",
      "Audio Mixer"
    ],
    departments: ["Sound"],
  },
  {
    position: "SFX Assistant",
    aliases: ["Special Effects Assistant"],
    departments: ["Special Effects"],
  },
  {
    position: "SFX Coordinator",
    aliases: ["Special Effects Coordinator", "Special FX Coordinator"],
    departments: ["Special Effects"],
  },
  {
    position: "SFX Supervisor",
    aliases: [
      "Special Effects Supervisor",
      "Special FX Supervisor",
      "SFX Supe",
    ],
    departments: ["Special Effects"],
  },
  {
    position: "Special Effects",
    aliases: ["SPFX", "SFX"],
    departments: ["Special Effects"],
  },
  {
    position: "Special Effects Makeup",
    aliases: ["SFX Makeup Artist", "Prosthetic Makeup Artist"],
    departments: ["Special Effects"],
  },
  {
    position: "Stunt Coordinator",
    aliases: [],
    departments: ["Stunts"],
  },
  {
    position: "Stunt Driver",
    aliases: [],
    departments: ["Stunts"],
  },
  {
    position: "Stunt Performer",
    aliases: ["Stunt Actor", "Stuntman", "Stuntwoman"],
    departments: ["Stunts"],
  },
  {
    position: "Film & Video Transfer Technician",
    aliases: [
      "Telecine Operator",
      "Datacine Operator",
      "Film and Video Transfer Technician",
    ],
    departments: ["Transfers"],
  },
  {
    position: "5-Ton Driver - Props Truck",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "5-Ton Driver - Set Dressing Truck",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "5-Ton Driver - Wardrobe Truck",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "10-Ton Driver - Camera Truck",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "10-Ton Driver - Electric Truck",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "10-Ton Driver - Grip Truck",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Agency Motorhome Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Art Teamster",
    aliases: ["Art Driver"],
    departments: ["Transportation"],
  },
  {
    position: "Base Camp Generator Operator",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Car Prep",
    aliases: ["Picture Vehicle Prep"],
    departments: ["Transportation"],
  },
  {
    position: "Cast Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Cast Trailer Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Cube Van Driver - Props Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Cube Van Driver - Set Dec Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Cube Van Driver - Sound/VTR Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Director Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Dispatcher",
    aliases: ["Transpo Dispatcher"],
    departments: ["Transportation"],
  },
  {
    position: "Driver",
    aliases: ["Teamster", "Production Driver"],
    departments: ["Transportation"],
  },
  {
    position: "Fuel Truck Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Honeywagon Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Honeywagon/Tractor Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Makeup/Hair Trailer Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - AD Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Art Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Camera Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Cast",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Elec Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Extras",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Grip Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - H&S Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - MU/H Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Production",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - VTR/Sound Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Minivan Driver - Ward Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Motorhome Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Picture Car Coordinator",
    aliases: ["Vehicle Wrangler"],
    departments: ["Transportation"],
  },
  {
    position: "Producer Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Stakebed Driver - Construction",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Stakebed Driver - Electric Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Stakebed Driver - Grip Dept",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "Transportation Captain",
    aliases: ["Transpo Captain"],
    departments: ["Transportation"],
  },
  {
    position: "Transportation Coordinator",
    aliases: ["Transpo Coord"],
    departments: ["Transportation"],
  },
  {
    position: "Wardrobe Trailer Driver",
    aliases: [],
    departments: ["Transportation"],
  },
  {
    position: "On Set VFX Supervisor",
    aliases: ["On-Set Visual Effects Sup"],
    departments: ["VFX"],
  },
  {
    position: "3D Generalist",
    aliases: [],
    departments: ["Visual Effects"],
  },
  {
    position: "3D Modeler",
    aliases: [],
    departments: ["Visual Effects"],
  },
  {
    position: "Compositing Artist",
    aliases: ["VFX Compositor", "Digital Compositor"],
    departments: ["Visual Effects"],
  },
  {
    position: "Digital Compositor",
    aliases: ["VFX Compositor", "Compositing Artist"],
    departments: ["Visual Effects"],
  },
  {
    position: "Flame Artist",
    aliases: ["Flame Compositor"],
    departments: ["Visual Effects"],
  },
  {
    position: "Matte Painter",
    aliases: ["Digital Matte Painter", "Environment Artist"],
    departments: ["Visual Effects"],
  },
  {
    position: "Rotoscope Artist",
    aliases: ["Roto Artist"],
    departments: ["Visual Effects"],
  },
  {
    position: "Stereo VFX Artist",
    aliases: ["Stereoscopic Visual Effects Artist", "3D VFX Artist"],
    departments: ["Visual Effects"],
  },
  {
    position: "Texture Artist",
    aliases: ["Surfacing Artist", "Shader Artist"],
    departments: ["Visual Effects"],
  },
  {
    position: "VFX Artist",
    aliases: ["CG Artist", "CGI Artist"],
    departments: ["Visual Effects"],
  },
  {
    position: "VFX Coordinator",
    aliases: ["Visual Effects Coordinator"],
    departments: ["Visual Effects"],
  },
  {
    position: "VFX Producer",
    aliases: ["Visual Effects Producer"],
    departments: ["Visual Effects"],
  },
  {
    position: "VFX Supervisor",
    aliases: ["Visual Effects Supervisor"],
    departments: ["Visual Effects"],
  },
  {
    position: "Co-Executive Producer",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Executive Story Editor",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Executive Story Editor / Co-Producer",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Executive Story Editor / Producer",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Researcher",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Staff Writer",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Story Editor",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Supervising Producer",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Writer's Assistant",
    aliases: [],
    departments: ["Writers"],
  },
  {
    position: "Screenplay Writer",
    aliases: ["Screenwriter"],
    departments: ["Writing"],
  },
  {
    position: "Story Writer",
    aliases: [],
    departments: ["Writing"],
  },
];
