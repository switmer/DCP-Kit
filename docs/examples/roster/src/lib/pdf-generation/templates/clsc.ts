import { formatDate } from 'date-fns/format';
import { chunk } from '@/lib/array/chunk';
import { classicStyle } from '@/lib/pdf-generation/styles/classicStyle';
import { TemplateParams } from '@/lib/pdf-generation/types';

export const clsc = (params: TemplateParams, crewTableContent: any) => {
  //-- get the middle of the array for two columns.
  const middle = Math.ceil(crewTableContent?.length / 2);

  return {
    ...(params?.options?.WATERMARKED
      ? {
          watermark: {
            text: 'Roster',
            color: '#bef264',
            angle: 45,
            opacity: 0.3,
            bold: true,
            italics: false,
          },
        }
      : {}),
    pageSize: 'TABLOID',
    pageMargins: [20, 40, 20, 40],
    header: {
      columns: [
        {
          text: params.sheetData.production_entity
            ? params.sheetData.production_entity.name.toUpperCase()
            : params.sheetData.company_name.toUpperCase(),
          style: 'headerLeft',
          alignment: 'left',
        },
        {
          text: 'CALL SHEET',
          style: 'headerRight',
          alignment: 'center',
        },
        {
          text: params.sheetData.client_entity
            ? params.sheetData.client_entity.name.toUpperCase()
            : params.sheetData.project_name.toUpperCase(),
          style: 'headerCenter',
          alignment: 'right',
        },
      ],
      margin: [20, 10, 20, 10],
    },
    content: [
      //-- project details.
      {
        columns: [
          {
            text: [`${params.sheetData?.day_of_days ? params.sheetData?.day_of_days : '--'}`],
            alignment: 'left',
          },
          {
            text: [
              // {
              //   text: `DATE: `,
              //   fontSize: 12,
              //   bold: true,
              // },

              {
                text: params.sheetData?.full_date ? formatDate(params.sheetData.full_date, 'EEEE, MMMM dd') : '--',
                // style: "dataCell",
              },
            ],
            // style: "labelCell",
            alignment: params.sheetData?.job_number ? 'center' : 'right', //-- adjust alignment based on job_number.
          },
          //-- only show and format a job_number if one exists.
          ...(params.sheetData?.job_number
            ? [
                {
                  text: [
                    {
                      text: `Job #${params.sheetData.job_number}`,
                    },
                  ],
                  alignment: 'right',
                },
              ]
            : []),
        ],
        margin: [0, 0, 0, 10],
      },

      //-- nearest hospital, crew call, and safety hotline.
      ...(params.sheetData?.nearest_hospital?.name ||
      params.sheetData?.nearest_hospital?.address ||
      params.sheetData?.general_crew_call
        ? [
            {
              table: {
                widths: ['30%', '40%', '30%'],
                body: [
                  [
                    {
                      text: 'NEAREST HOSPITAL',
                      style: 'tableHeader',
                      alignment: 'center',
                      fillColor: '#f2f2f2',
                      border: [true, true, true, true],
                    },
                    {
                      text: 'CREW CALL',
                      style: 'tableHeader',
                      alignment: 'center',
                      fillColor: '#f2f2f2',
                      border: [true, true, true, true],
                    },
                    {
                      text: 'IATSE SAFETY HOTLINE',
                      style: 'tableHeader',
                      alignment: 'center',
                      fillColor: '#f2f2f2',
                      border: [true, true, true, true],
                    },
                  ],
                  [
                    //-- nearest hospital.
                    {
                      stack: [
                        {
                          text: params.sheetData?.nearest_hospital?.name ?? '--',
                          style: 'tableCell',
                          alignment: 'center',
                          bold: true,
                          margin: [0, 0, 0, 3],
                        },
                        {
                          text: params.sheetData?.nearest_hospital?.address ?? '--',
                          style: 'tableCell',
                          alignment: 'center',
                          margin: [0, 0, 0, 3],
                        },
                        {
                          text: params.sheetData?.nearest_hospital?.phone ?? '--',
                          style: 'tableCell',
                          alignment: 'center',
                          margin: [0, 0, 0, 3],
                        },
                      ],
                      border: [true, true, true, true],
                    },

                    //-- crew call.
                    {
                      stack: [
                        {
                          text: params.sheetData?.general_crew_call ?? '--',
                          style: 'tableCell',
                          alignment: 'center',
                          fontSize: 24,
                          color: '#ee2222',
                          bold: true,
                          margin: params.sheetData?.raw_json?.meal_times?.breakfast
                            ? [0, 5, 0, 3]
                            : [
                                0,
                                params.sheetData?.production_contacts
                                  ? params.sheetData?.production_contacts?.length * 3
                                  : 10,
                                0,
                                3,
                              ],
                        },
                        ...(params.sheetData?.raw_json?.meal_times?.breakfast
                          ? [
                              {
                                text: `Breakfast: ${params.sheetData?.raw_json?.meal_times?.breakfast}`,
                                style: 'tableCell',
                                alignment: 'center',
                                margin: [0, 0, 0, 3],
                              },
                            ]
                          : []),
                      ],
                      border: [true, true, true, true],
                    },

                    //-- safety hotline.
                    {
                      stack: [
                        {
                          text: '844-422-9273',
                          style: 'tableCell',
                          alignment: 'center',
                          fontSize: 14,
                          // color: "#ee2222",
                          bold: true,
                          margin: [0, 10, 0, 10],
                        },
                      ],
                      border: [true, true, true, true],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: function () {
                  return 0.5;
                },
                vLineWidth: function () {
                  return 0.5;
                },
                hLineColor: function () {
                  return '#aaa';
                },
                vLineColor: function () {
                  return '#aaa';
                },
              },
              margin: [0, 0, 0, 0],
            },
          ]
        : []),

      //-- production contacts.
      params.sheetData?.production_contacts?.length > 0
        ? [
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'PROD. CONTACTS',
                      style: 'sectionHeader',
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 5, 0, 5],
            },
            {
              columns: params.sheetData?.production_contacts.map((contact: any) => {
                return {
                  width: '*',
                  stack: [
                    {
                      text: contact.name,
                      style: 'contactName',
                    },
                    {
                      text: contact.title,
                      style: 'contactTitle',
                    },
                    {
                      text: contact.phone,
                      style: 'contactPhone',
                    },
                  ],
                  margin: [0, 0, 10, 0],
                };
              }),
            },
          ]
        : [],

      //-- locations.
      ...(params.sheetData?.locations?.length > 0
        ? [
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: 'LOCATIONS',
                      style: 'sectionHeader',
                    },
                  ],
                ],
              },
              layout: 'noBorders',
              margin: [0, 15, 0, 5],
            },
            {
              table: {
                widths: ['*', '*'],
                body: chunk(params.sheetData?.other_locations, 2).map((row: any[]) => [
                  //-- first column.
                  row[0]
                    ? {
                        stack: [
                          {
                            text: row[0].type.toUpperCase(),
                            style: 'locationType',
                          },
                          {
                            text: row[0].name,
                            style: 'locationName',
                          },
                          {
                            text: row[0].address,
                            style: 'locationAddress',
                          },
                          {
                            text: row[0].description,
                            style: 'locationDescription',
                            italics: true,
                          },
                          {
                            text: [
                              { text: 'Notes: ', bold: true },
                              {
                                text: !!row[0].instructions_or_notes ? row[0].instructions_or_notes : '',
                              },
                            ],
                            style: 'notesText',
                            margin: [0, 5, 0, 5],
                          },
                        ],
                      }
                    : {},

                  //-- second column.
                  row[1]
                    ? {
                        stack: [
                          {
                            text: row[1].type.toUpperCase(),
                            style: 'locationType',
                          },
                          {
                            text: row[1].name,
                            style: 'locationName',
                          },
                          {
                            text: row[1].address,
                            style: 'locationAddress',
                          },
                          {
                            text: row[1].description,
                            style: 'locationDescription',
                            italics: true,
                          },
                          {
                            text: [
                              { text: 'Notes: ', bold: true },
                              {
                                text: !!row[1].instructions_or_notes ? row[1].instructions_or_notes : '',
                              },
                            ],
                            style: 'notesText',
                            margin: [0, 5, 0, 5],
                          },
                        ],
                      }
                    : {},
                ]),
              },
              layout: {
                hLineWidth: function (i: number, node: any) {
                  return i === 0 || i === node.table.body?.length ? 1 : 0.5;
                },
                vLineWidth: function () {
                  return 0.5;
                },
                hLineColor: function () {
                  return '#aaa';
                },
                vLineColor: function () {
                  return '#aaa';
                },
              },
            },
          ]
        : []),

      //-- crew and notes tables.
      ...(params?.options?.USE_TWO_COLUMNS
        ? [
            //-- two-columns.
            {
              columns: [
                //-- left column.
                {
                  width: '50%',
                  stack: crewTableContent.slice(0, middle).flat(),
                },

                // //-- spacer.
                // {
                //   width: "1%",
                //   text: "",
                // },

                //-- right column.
                {
                  width: '50%',
                  stack: crewTableContent.slice(middle).flat(),
                },
              ],
            },
          ]
        : //-- single-column.
          crewTableContent.flat()),
    ].flat(),
    styles: params?.options?.style ?? classicStyle,
    defaultStyle: {
      font: 'Roboto',
    },
  };
};
