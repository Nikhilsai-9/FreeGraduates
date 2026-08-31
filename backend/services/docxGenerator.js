import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
} from "docx";

export async function generateResumeDocx(resume) {
  const pInfo = resume.personalInfo || {};
  const workExp = resume.workExperience || [];
  const edu = resume.education || [];
  const skills = resume.skills || {};
  const projects = resume.projects || [];
  const certifications = resume.certifications || [];

  const children = [];

  // 1. Header — Name & Contact
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: pInfo.fullName || "Candidate Name",
          bold: true,
          size: 32, // 16pt
          font: "Arial"
        })
      ],
      spacing: { after: 120 }
    })
  );

  const contactPieces = [];
  if (pInfo.email) contactPieces.push(pInfo.email);
  if (pInfo.phone) contactPieces.push(pInfo.phone);
  if (pInfo.location) contactPieces.push(pInfo.location);
  if (pInfo.linkedin) contactPieces.push(pInfo.linkedin);
  if (pInfo.github) contactPieces.push(pInfo.github);
  if (pInfo.portfolio) contactPieces.push(pInfo.portfolio);

  if (contactPieces.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: contactPieces.join(" | "),
            size: 20, // 10pt
            font: "Arial"
          })
        ],
        spacing: { after: 240 }
      })
    );
  }

  const createSectionHeader = (title) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      border: {
        bottom: {
          color: "1A91F0",
          space: 2,
          style: BorderStyle.SINGLE,
          size: 12
        }
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 24, // 12pt
          color: "1A91F0",
          font: "Arial"
        })
      ],
      spacing: { before: 200, after: 120 }
    });
  };

  // 2. Summary
  if (resume.summary) {
    children.push(createSectionHeader("Professional Summary"));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resume.summary,
            size: 21,
            font: "Arial"
          })
        ],
        spacing: { after: 160 }
      })
    );
  }

  // 3. Technical Skills
  const techList = skills.technical || [];
  const toolsList = skills.tools || [];
  const softList = skills.soft || [];

  if (techList.length > 0 || toolsList.length > 0 || softList.length > 0) {
    children.push(createSectionHeader("Skills & Competencies"));

    if (techList.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Technical Skills: ", bold: true, size: 21, font: "Arial" }),
            new TextRun({ text: techList.join(", "), size: 21, font: "Arial" })
          ],
          spacing: { after: 60 }
        })
      );
    }

    if (toolsList.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Tools & Frameworks: ", bold: true, size: 21, font: "Arial" }),
            new TextRun({ text: toolsList.join(", "), size: 21, font: "Arial" })
          ],
          spacing: { after: 60 }
        })
      );
    }

    if (softList.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Core Competencies: ", bold: true, size: 21, font: "Arial" }),
            new TextRun({ text: softList.join(", "), size: 21, font: "Arial" })
          ],
          spacing: { after: 160 }
        })
      );
    }
  }

  // 4. Experience
  if (workExp.length > 0) {
    children.push(createSectionHeader("Work Experience"));

    for (const exp of workExp) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.role || "Role", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: ` — ${exp.company || "Company"}`, bold: true, size: 22, font: "Arial", color: "444444" }),
            new TextRun({
              text: `\t${exp.startDate || ""} - ${exp.current ? "Present" : exp.endDate || ""}`,
              size: 20,
              font: "Arial",
              color: "666666"
            })
          ],
          spacing: { before: 100, after: 60 }
        })
      );

      for (const bullet of exp.bullets || []) {
        if (bullet && bullet.trim()) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: bullet.trim(),
                  size: 21,
                  font: "Arial"
                })
              ],
              spacing: { after: 40 }
            })
          );
        }
      }
    }
  }

  // 5. Projects
  if (projects.length > 0) {
    children.push(createSectionHeader("Projects"));

    for (const proj of projects) {
      const techStr = proj.techStack && proj.techStack.length > 0 ? ` | Tech: ${proj.techStack.join(", ")}` : "";
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: proj.title || "Project", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: techStr, size: 20, font: "Arial", color: "666666" })
          ],
          spacing: { before: 80, after: 40 }
        })
      );

      if (proj.description) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: proj.description,
                size: 21,
                font: "Arial"
              })
            ],
            spacing: { after: 40 }
          })
        );
      }
    }
  }

  // 6. Education
  if (edu.length > 0) {
    children.push(createSectionHeader("Education"));

    for (const item of edu) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${item.degree || "Degree"} ${item.field ? `in ${item.field}` : ""}`,
              bold: true,
              size: 22,
              font: "Arial"
            }),
            new TextRun({ text: ` — ${item.institution || "Institution"}`, size: 22, font: "Arial" }),
            new TextRun({
              text: `\t${item.year || ""}${item.grade ? ` | ${item.grade}` : ""}`,
              size: 20,
              font: "Arial",
              color: "666666"
            })
          ],
          spacing: { before: 60, after: 60 }
        })
      );
    }
  }

  // 7. Certifications
  if (certifications.length > 0) {
    children.push(createSectionHeader("Certifications"));
    for (const cert of certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: cert, size: 21, font: "Arial" })
          ],
          spacing: { after: 40 }
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
