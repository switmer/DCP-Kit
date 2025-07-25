import { TemplateParams } from '@/lib/pdf-generation/types';
import { classicStyle } from '@/lib/pdf-generation/styles/classicStyle';
import { formatDate } from 'date-fns/format';

export const bsct = (params: TemplateParams, crewTableContent: any) => {
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
          text: params.sheetData?.production_entity
            ? params.sheetData?.production_entity.name.toUpperCase()
            : params.sheetData?.company_name.toUpperCase(),
          style: 'headerLeft',
          alignment: 'left',
        },
        {
          text: 'CALL SHEET',
          style: 'headerCenter',
          alignment: 'center',
        },
        {
          text: params.sheetData?.client_entity
            ? params.sheetData?.client_entity.name.toUpperCase()
            : params.sheetData?.project_name.toUpperCase(),
          style: 'headerRight',
          alignment: 'right',
        },
      ],
      margin: [20, 10, 20, 10],
    },
    // footer: function (currentPage: number, pageCount: number) {
    //   return {
    //     columns: [
    //       {
    //         text: `${params.sheetData?.project_name} - ${params.sheetData?.day_of_days}`,
    //         alignment: "left",
    //         margin: [40, 0, 0, 0],
    //         fontSize: 8,
    //       },
    //       {
    //         text: `Page ${currentPage} of ${pageCount}`,
    //         alignment: "right",
    //         margin: [0, 0, 40, 0],
    //         fontSize: 8,
    //       },
    //     ],
    //   };
    // },
    content: [
      //-- top purple bar with shoot day info.
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                columns: [
                  {
                    text: [`${params.sheetData?.day_of_days}`],
                    alignment: 'left',
                    fontSize: 14,
                    bold: true,
                  },
                  {
                    text: formatDate(params.sheetData?.full_date, 'EEEE, MMMM dd'),
                    alignment: params.sheetData?.job_number ? 'center' : 'right', //-- adjust alignment based on job_number.
                    fontSize: 14,
                    bold: true,
                  },
                  //-- only show and format a job_number if one exists.
                  ...(params.sheetData?.job_number
                    ? [
                        {
                          text: [
                            {
                              text: `Job #${params.sheetData?.job_number}`,
                            },
                          ],
                          alignment: 'right',
                        },
                      ]
                    : []),
                ],
                fillColor: '#e6e1f9',
                padding: [10, 8, 10, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: function () {
            return 0;
          },
          vLineWidth: function () {
            return 0;
          },
        },
        margin: [0, 0, 0, 0],
      },

      //-- shoot day, cameras, etc.
      {
        table: {
          widths: ['30%', '70%'], //-- outer table, two columns.
          body: [
            [
              //-- nested tables -- left side (shoot details, crew call, etc.).
              {
                table: {
                  widths: ['100%'],
                  body: [
                    [
                      //-- shoot details.
                      {
                        table: {
                          widths: ['40%', '60%'],
                          body: [
                            [
                              {
                                text: 'Shoot Day:',
                                style: 'tableCell',
                                border: [true, true, true, true],
                                fillColor: '#f2f2f2',
                              },
                              {
                                text: formatDate(params.sheetData?.full_date, 'MM/dd'),
                                style: 'tableCell',
                                border: [true, true, true, true],
                              },
                            ],
                            [
                              {
                                text: 'Cameras:',
                                style: 'tableCell',
                                border: [true, true, true, true],
                                fillColor: '#f2f2f2',
                              },
                              {
                                text: '--',
                                style: 'tableCell',
                                border: [true, true, true, true],
                              },
                            ],
                            [
                              {
                                text: 'Sync/MOS:',
                                style: 'tableCell',
                                border: [true, true, true, true],
                                fillColor: '#f2f2f2',
                              },
                              {
                                text: '--',
                                style: 'tableCell',
                                border: [true, true, true, true],
                              },
                            ],
                            [
                              {
                                text: 'Spot Name(s):',
                                style: 'tableCell',
                                border: [true, true, true, true],
                                fillColor: '#f2f2f2',
                              },
                              {
                                text: '--',
                                style: 'tableCell',
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
                    ],
                    [
                      //-- crew call and hospital.
                      {
                        table: {
                          widths: ['50%', '50%'],
                          body: [
                            [
                              {
                                text: 'CREW CALL',
                                style: 'tableCell',
                                alignment: 'center',
                                bold: true,
                                fillColor: '#f2f2f2',
                                border: [true, true, true, true],
                              },
                              {
                                text: 'HOSPITAL',
                                style: 'tableCell',
                                alignment: 'center',
                                bold: true,
                                fillColor: '#f2f2f2',
                                border: [true, true, true, true],
                              },
                            ],
                            [
                              {
                                text: params.sheetData?.general_crew_call ?? '--',
                                style: 'tableCell',
                                alignment: 'center',
                                color: 'red',
                                bold: true,
                                fontSize: 14,
                                border: [true, true, true, true],
                              },
                              {
                                stack: [
                                  ...(params.sheetData?.nearest_hospital
                                    ? [
                                        {
                                          text: params.sheetData.nearest_hospital.name,
                                          style: 'tableCell',
                                          fontStyle: 'bold',
                                          alignment: 'center',
                                        },
                                        {
                                          text: params.sheetData.nearest_hospital.address,
                                          style: 'tableCell',
                                          alignment: 'center',
                                          justification: 'center',
                                        },
                                        {
                                          text: params.sheetData.nearest_hospital.phone,
                                          style: 'tableCell',
                                          alignment: 'center',
                                        },
                                      ]
                                    : []),
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
                    ],
                    [
                      //-- breakfast and safety hotline.
                      {
                        table: {
                          widths: ['50%', '50%'],
                          body: [
                            [
                              {
                                text: 'BREAKFAST',
                                style: 'tableCell',
                                alignment: 'center',
                                bold: true,
                                fillColor: '#f2f2f2',
                                border: [true, true, true, true],
                              },
                              {
                                text: 'SAFETY HOTLINE',
                                style: 'tableCell',
                                alignment: 'center',
                                bold: true,
                                fillColor: '#f2f2f2',
                                border: [true, true, true, true],
                              },
                            ],
                            [
                              {
                                text: params.sheetData?.schedule?.meal_times?.breakfast ?? '--',
                                style: 'tableCell',
                                alignment: 'center',
                                bold: true,
                                border: [true, true, true, true],
                              },
                              {
                                stack: [
                                  // {
                                  //   text: "--",
                                  //   style: "tableCell",
                                  //   alignment: "center",
                                  //   fontStyle: "bold",
                                  // },
                                  {
                                    text: '--',
                                    style: 'tableCell',
                                    alignment: 'center',
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
                    ],
                  ],
                },
                layout: 'noBorders',
              },

              //-- second table -- headers as columns.
              {
                table: {
                  widths: ['25%', '25%', '25%', '25%'],
                  heights: function (row: any) {
                    return row === 0 ? 20 : 150;
                  },
                  body: [
                    [
                      //-- headers in a single row, each with its own column.
                      {
                        text: 'LOCATION',
                        style: 'tableHeader',
                        alignment: 'center',
                        fillColor: '#cccccc',
                        border: [true, true, true, true],
                      },
                      {
                        text: 'CREW PARKING',
                        style: 'tableHeader',
                        alignment: 'center',
                        fillColor: '#cccccc',
                        border: [true, true, true, true],
                      },
                      {
                        text: 'TRUCK PARKING',
                        style: 'tableHeader',
                        alignment: 'center',
                        fillColor: '#cccccc',
                        border: [true, true, true, true],
                      },
                      {
                        text: 'WEATHER',
                        style: 'tableHeader',
                        alignment: 'center',
                        fillColor: '#cccccc',
                        border: [true, true, true, true],
                      },
                    ],
                    //-- second row for content.
                    [
                      ...(params.sheetData?.shoot_location
                        ? [
                            {
                              stack: [
                                {
                                  text: params.sheetData?.shoot_location.name,
                                  style: 'tableCell',
                                  bold: true,
                                  fontSize: 12,
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                  margin: [0, 0, 0, 10],
                                },
                                {
                                  text: params.sheetData?.shoot_location.address,
                                  style: 'tableCell',
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                  margin: [0, 0, 0, 10],
                                },
                                {
                                  text: params.sheetData?.shoot_location.phone,
                                  style: 'tableCell',
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                  margin: [0, 0, 0, 10],
                                },
                                {
                                  text: params.sheetData?.shoot_location.instructions_or_notes,
                                  style: 'tableCell',
                                  fontStyle: 'italic',
                                  fontSize: 8,
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                },
                              ],
                            },
                          ]
                        : [
                            {
                              text: '--',
                              style: 'tableCell',
                              alignment: 'center',
                              border: [true, true, true, true],
                            },
                          ]),
                      ...(params.sheetData?.parking_location
                        ? [
                            {
                              stack: [
                                {
                                  text: params.sheetData?.parking_location.name,
                                  style: 'tableCell',
                                  bold: true,
                                  fontSize: 12,
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                  margin: [0, 0, 0, 10],
                                },
                                {
                                  text: params.sheetData?.parking_location.address,
                                  style: 'tableCell',
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                  margin: [0, 0, 0, 10],
                                },
                                {
                                  text: params.sheetData?.parking_location.phone,
                                  style: 'tableCell',
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                  margin: [0, 0, 0, 10],
                                },
                                {
                                  text: params.sheetData?.parking_location.instructions_or_notes,
                                  style: 'tableCell',
                                  fontStyle: 'italic',
                                  fontSize: 8,
                                  alignment: 'center',
                                  border: [true, true, true, true],
                                },
                              ],
                            },
                          ]
                        : [
                            {
                              text: '--',
                              style: 'tableCell',
                              alignment: 'center',
                              border: [true, true, true, true],
                            },
                          ]),
                      {
                        text: '--',
                        style: 'tableCell',
                        alignment: 'center',
                        border: [true, true, true, true],
                      },
                      {
                        //-- weather details.
                        stack: [
                          //-- first row - temperature.
                          {
                            table: {
                              widths: ['50%', '50%'],
                              heights: 30,
                              body: [
                                [
                                  {
                                    text: params.sheetData?.weather?.high ?? '--',
                                    alignment: 'center',
                                    bold: true,
                                  },
                                  {
                                    text: params.sheetData?.weather?.low ?? '--',
                                    alignment: 'center',
                                    bold: true,
                                  },
                                ],
                              ],
                            },
                            layout: 'noBorders',
                          },

                          //-- second row - conditions.
                          {
                            table: {
                              widths: ['50%', '50%'],
                              heights: 30,
                              body: [
                                [
                                  {
                                    text: params.sheetData?.weather?.condition ?? '--',
                                    alignment: 'center',
                                    fontSize: 9,
                                  },
                                  {
                                    text: params.sheetData?.weather?.condition ?? '--',
                                    alignment: 'center',
                                    fontSize: 9,
                                  },
                                ],
                              ],
                            },
                            layout: 'noBorders',
                          },

                          //-- third row - rain and humidity,
                          {
                            table: {
                              widths: ['50%', '50%'],
                              heights: 30,
                              body: [
                                [
                                  {
                                    text: params.sheetData?.weather?.chanceOfRain ?? '--',
                                    alignment: 'center',
                                    color: 'red',
                                    fontSize: 8,
                                  },
                                  {
                                    text: params.sheetData?.weather?.humidity ?? '--',
                                    alignment: 'center',
                                    color: 'red',
                                    fontSize: 8,
                                  },
                                ],
                              ],
                            },
                            layout: 'noBorders',
                          },

                          //-- spacer.
                          // {
                          //   text: "",
                          //   margin: [0, 0, 0, 0],
                          //   height: function () {
                          //     return 60;
                          //   },
                          // },

                          //-- fourth row - sunrise and sunset.
                          {
                            table: {
                              widths: ['50%', '50%'],
                              body: [
                                [
                                  {
                                    text: 'SUNRISE',
                                    alignment: 'center',
                                    fillColor: '#cccccc',
                                    fontSize: 9,
                                  },
                                  {
                                    text: 'SUNSET',
                                    alignment: 'center',
                                    fillColor: '#cccccc',
                                    fontSize: 9,
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
                          },

                          //-- fifth row - times and icons.
                          {
                            table: {
                              widths: ['50%', '50%'],
                              body: [
                                [
                                  {
                                    stack: [
                                      {
                                        text: params.sheetData?.weather?.sunrise ?? '--',
                                        alignment: 'center',
                                        fontSize: 9,
                                      },
                                      {
                                        text: 'icon️',
                                        alignment: 'center',
                                      },
                                    ],
                                  },
                                  {
                                    stack: [
                                      {
                                        text: params.sheetData?.weather?.sunset ?? '--',
                                        alignment: 'center',
                                        fontSize: 9,
                                      },
                                      { text: 'icon', alignment: 'center' },
                                    ],
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

      //-- production company, client, editorial, vfx, and production cells.
      {
        table: {
          //-- dynamically adjust columns depending on number of entities.
          widths: Array(
            3 + (params.sheetData?.other_entities?.length > 0 ? params.sheetData?.other_entities.length : 0),
          ).fill('*'),
          body: [
            [
              {
                text: 'PRODUCTION COMPANY',
                style: 'tableHeader',
                alignment: 'center',
                fillColor: '#f2f2f2',
                border: [true, true, true, true],
              },
              {
                text: 'AGENCY',
                style: 'tableHeader',
                alignment: 'center',
                fillColor: '#f2f2f2',
                border: [true, true, true, true],
              },
              {
                text: 'CLIENT',
                style: 'tableHeader',
                alignment: 'center',
                fillColor: '#f2f2f2',
                border: [true, true, true, true],
              },
              ...(params.sheetData?.other_entities?.length > 0
                ? params.sheetData?.other_entities.map((ent: any) => ({
                    text: ent.type.toUpperCase(),
                    style: 'tableHeader',
                    alignment: 'center',
                    fillColor: '#f2f2f2',
                    border: [true, true, true, true],
                  }))
                : []),
            ],
            [
              //-- production entity.
              {
                stack: [
                  {
                    text: `Name: ${params.sheetData?.production_entity.name}`,
                    style: 'tableCell',
                    alignment: 'center',
                    bold: true,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    text: `Address: ${params.sheetData?.production_entity.address}`,
                    style: 'tableCell',
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                  },
                  {
                    text: `Phone: ${params.sheetData?.production_entity.phone}`,
                    style: 'tableCell',
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- agency entity.
              {
                stack: [
                  {
                    text: `Name: ${params.sheetData?.agency_entity.name}`,
                    style: 'tableCell',
                    alignment: 'center',
                    bold: true,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    text: `Address: ${params.sheetData?.agency_entity.address}`,
                    style: 'tableCell',
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                  },
                  {
                    text: `Phone: ${params.sheetData?.agency_entity.phone}`,
                    style: 'tableCell',
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- client entity.
              {
                stack: [
                  {
                    text: `Name: ${params.sheetData?.client_entity.name}`,
                    style: 'tableCell',
                    alignment: 'center',
                    bold: true,
                    margin: [0, 0, 0, 10],
                  },
                  {
                    text: `Address: ${params.sheetData?.client_entity.address}`,
                    style: 'tableCell',
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                  },
                  {
                    text: `Phone: ${params.sheetData?.client_entity.phone}`,
                    style: 'tableCell',
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- other entities.
              ...(params.sheetData?.other_entities?.length > 0
                ? params.sheetData?.other_entities.map((ent: any) => ({
                    stack: [
                      {
                        text: `Name: ${ent.name}`,
                        style: 'tableCell',
                        alignment: 'center',
                        bold: true,
                        margin: [0, 0, 0, 10],
                      },
                      {
                        text: `Address: ${ent.address}`,
                        style: 'tableCell',
                        alignment: 'center',
                        margin: [0, 0, 0, 10],
                      },
                      {
                        text: `Phone: ${ent.phone}`,
                        style: 'tableCell',
                        alignment: 'center',
                        margin: [0, 0, 0, 10],
                      },
                    ],
                    border: [true, true, true, true],
                  }))
                : []),
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

      //-- reminder bar.
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: 'REMINDER: TURN IN YOUR TIME CARD TO PRODUCTION SUPERVISOR EITHER AT THE END OF EACH WEEK OR ON YOUR LAST DAY OF EMPLOYMENT, WHICHEVER COMES FIRST',
                style: 'tableCell',
                alignment: 'center',
                bold: true,
                fillColor: '#FFFF00',
                padding: [5, 8, 5, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: function () {
            return 0;
          },
          vLineWidth: function () {
            return 0;
          },
        },
        margin: [0, 0, 0, 0],
      },

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
          body: params.sheetData?.other_locations.map((loc: any) => [
            {
              stack: [
                {
                  text: loc.type.toUpperCase(),
                  style: 'locationType',
                },
                {
                  text: loc.name,
                  style: 'locationName',
                },
                {
                  text: loc.address,
                  style: 'locationAddress',
                },
                {
                  text: loc.description,
                  style: 'locationDescription',
                  italics: true,
                },
              ],
            },
            {
              stack: [
                {
                  text: 'Notes:',
                  style: 'labelCell',
                },
                {
                  text: !!loc.instructions_or_notes ? loc.instructions_or_notes : '',
                  style: 'notesText',
                },
              ],
            },
          ]),
        },
        layout: {
          hLineWidth: function (i: number, node: any) {
            return i === 0 || i === node.table?.body?.length ? 1 : 0.5;
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

      // //-- files.
      // body.data.files && body.data.files.length > 0
      //   ? [
      //       {
      //         table: {
      //           widths: ["*"],
      //           body: [
      //             [
      //               {
      //                 text: "ATTACHED FILES",
      //                 style: "sectionHeader",
      //               },
      //             ],
      //           ],
      //         },
      //         layout: "noBorders",
      //         margin: [0, 15, 0, 5],
      //       },
      //       {
      //         ul: body.data.files.map((file: any) => ({
      //           text: file.title,
      //           style: "fileItem",
      //         })),
      //       },
      //     ]
      //   : [],

      //-- people.
      // {
      //   table: {
      //     widths: ["*"],
      //     body: [
      //       [
      //         {
      //           text: "CREW LIST",
      //           style: "sectionHeader",
      //         },
      //       ],
      //     ],
      //   },
      //   layout: "noBorders",
      //   margin: [0, 15, 0, 5],
      // },
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
                //-- spacer.
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
