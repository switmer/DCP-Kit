import { formatDate } from 'date-fns/format';
import { convertUnixTimeToAmPm } from '@/lib/weather/convertUnixTimeToAmPm';
import { chunk } from '@/lib/array/chunk';
import { classicStyle } from '@/lib/pdf-generation/styles/classicStyle';
import { TemplateParams } from '@/lib/pdf-generation/types';

export const advd = (params: TemplateParams, crewTableContent: any) => {
  //-- get the middle of the array for two columns.
  const middle = Math.ceil(crewTableContent?.length / 2);

  //-- calculate width for second row of cells.
  const advdSecondRowWidth = ['*', '*'];

  //-- add a column when truck parking and/or weather exists.
  (params.sheetData?.truck_parking_location?.name || params.sheetData?.truck_parking_location?.address) &&
    advdSecondRowWidth.push('*');
  (params.sheetData?.weather?.low || params.sheetData?.weather?.high) && advdSecondRowWidth.push('*');

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
    pageMargins: [20, 60, 20, 10],
    header: {
      columns: [
        //-- left column - production (33% width)
        {
          width: '33%',
          stack: [
            params.sheetData?.production_entity?.logo
              ? {
                  image: params.sheetData.production_entity.logo,
                  width: 100,
                  fit: [120, 45],
                  alignment: 'left',
                }
              : {
                  text: params.sheetData?.production_entity?.name
                    ? params.sheetData.production_entity.name.toUpperCase()
                    : params.sheetData?.company_name.toUpperCase(),
                  style: 'headerLeft',
                },
          ],
          alignment: 'left',
        },

        //-- center column (34% width)
        {
          width: '34%',
          text: 'CALL SHEET',
          style: 'headerCenter',
          alignment: 'center',
        },

        //-- right column - client (33% width)
        {
          width: '33%',
          stack: [
            params.sheetData?.client_entity?.logo
              ? {
                  image: params.sheetData.client_entity.logo,
                  width: 100,
                  fit: [120, 45],
                  alignment: 'right',
                }
              : {
                  text: params.sheetData?.client_entity?.name
                    ? params.sheetData.client_entity.name.toUpperCase()
                    : params.sheetData?.project_name.toUpperCase(),
                  style: 'headerRight',
                },
          ],
          alignment: 'right',
        },
      ],
      margin: [20, 10, 20, 0],
    },
    // header: {
    //   columns: [
    //     {
    //       text: params.sheetData?.production_entity
    //         ? params.sheetData?.production_entity.name.toUpperCase()
    //         : params.sheetData?.company_name.toUpperCase(),
    //       style: 'headerLeft',
    //       alignment: 'left',
    //     },
    //     {
    //       text: 'CALL SHEET',
    //       style: 'headerCenter',
    //       alignment: 'center',
    //     },
    //     {
    //       text: params.sheetData?.client_entity
    //         ? params.sheetData?.client_entity.name.toUpperCase()
    //         : params.sheetData?.project_name.toUpperCase(),
    //       style: 'headerRight',
    //       alignment: 'right',
    //     },
    //   ],
    //   margin: [20, 10, 20, 10],
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
                    text: params.sheetData?.full_date ? formatDate(params.sheetData?.full_date, 'EEEE, MMMM dd') : '--',
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

      //-- production contacts, crew call, and nearest hospital.
      {
        table: {
          widths: ['30%', '40%', '30%'],
          body: [
            [
              {
                text: 'PROD. CONTACTS',
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
                text: 'NEAREST HOSPITAL',
                style: 'tableHeader',
                alignment: 'center',
                fillColor: '#f2f2f2',
                border: [true, true, true, true],
              },
            ],
            [
              //-- production contacts.
              {
                stack: [
                  ...params.sheetData?.production_contacts.map((contact: any) => ({
                    text: [
                      //-- title.
                      {
                        text: `${contact.title ? `${contact.title}: ` : ''}`,
                        bold: true,
                      },
                      //-- name and phone..
                      {
                        text: `${contact.name}${contact.phone ? ` - ${contact.phone}` : ''}`,
                        fontSize: 8,
                      },
                    ],
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  })),
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

              //-- nearest hospital.
              {
                stack: [
                  {
                    text: params.sheetData?.nearest_hospital?.name ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    bold: true,
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.nearest_hospital?.address ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.nearest_hospital?.phone ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                  {
                    stack: [
                      {
                        text: [{ text: 'IATSE SAFETY HOTLINE: ', bold: true }, { text: '844-422-9273' }],
                        style: 'tableCell',
                        alignment: 'left',
                        margin: [0, 5, 0, 3],
                      },
                    ],
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

      //-- shoot location, crew parking, truck parking, and weather.
      {
        table: {
          widths: advdSecondRowWidth,
          body: [
            [
              {
                text: 'SHOOT LOCATION',
                style: 'tableHeader',
                alignment: 'center',
                fillColor: '#f2f2f2',
                border: [true, true, true, true],
              },
              {
                text: 'CREW PARKING',
                style: 'tableHeader',
                alignment: 'center',
                fillColor: '#f2f2f2',
                border: [true, true, true, true],
              },

              //-- if truck_parking_location exists, create the column and header.
              ...(params.sheetData?.truck_parking_location.name || params.sheetData?.truck_parking_location.address
                ? [
                    {
                      text: 'TRUCK PARKING',
                      style: 'tableHeader',
                      alignment: 'center',
                      fillColor: '#f2f2f2',
                      border: [true, true, true, true],
                    },
                  ]
                : []),

              //-- if weather exists, create the column and header.
              ...(params.sheetData?.weather.low || params.sheetData?.weather.high
                ? [
                    {
                      text: 'WEATHER',
                      style: 'tableHeader',
                      alignment: 'center',
                      fillColor: '#f2f2f2',
                      border: [true, true, true, true],
                    },
                  ]
                : []),
            ],
            [
              //-- shoot location.
              {
                stack: [
                  {
                    text: params.sheetData?.shoot_location?.name ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    bold: true,
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.shoot_location?.address ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.shoot_location?.phone ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- crew parking.
              {
                stack: [
                  {
                    text: params.sheetData?.parking_location?.name ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    bold: true,
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.parking_location?.address ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.parking_location?.phone ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- truck parking, only if it exists.
              ...(params.sheetData?.truck_parking_location.name || params.sheetData?.truck_parking_location.address
                ? [
                    {
                      stack: [
                        {
                          text: params.sheetData?.truck_parking_location?.name ?? '--',
                          style: 'tableCell',
                          alignment: 'left',
                          bold: true,
                          margin: [0, 0, 0, 3],
                        },
                        {
                          text: params.sheetData?.truck_parking_location?.address ?? '--',
                          style: 'tableCell',
                          alignment: 'left',
                          margin: [0, 0, 0, 3],
                        },
                        {
                          text: params.sheetData?.truck_parking_location?.phone ?? '--',
                          style: 'tableCell',
                          alignment: 'left',
                          margin: [0, 0, 0, 3],
                        },
                      ],
                      border: [true, true, true, true],
                    },
                  ]
                : []),

              //-- weather, only if it exists.
              ...(params.sheetData?.weather.low || params.sheetData?.weather.high
                ? [
                    {
                      stack: [
                        {
                          text: [
                            { text: `High: `, bold: true },
                            {
                              text: Math.round(params.sheetData?.weather.high),
                            },
                            { text: ' | ' }, //-- separator.
                            { text: `Low: `, bold: true },
                            {
                              text: Math.round(params.sheetData?.weather.low),
                            },
                          ],
                          margin: [0, 1, 0, 2],
                        },
                        {
                          text: [
                            {
                              text: params.sheetData?.weather.condition.main,
                            },
                            {
                              text: ` / ${params.sheetData?.weather.condition.description}`,
                            },
                          ],
                          fontSize: 10,
                        },
                        {
                          text: [
                            { text: `Sunrise: `, bold: true },
                            {
                              text: params.sheetData?.weather?.sunrise
                                ? convertUnixTimeToAmPm(params.sheetData.weather.sunrise)
                                : '--',
                            },
                            { text: ' | ' }, //-- separator.
                            { text: `Sunset: `, bold: true },
                            {
                              text: params.sheetData?.weather?.sunset
                                ? convertUnixTimeToAmPm(params.sheetData?.weather.sunset)
                                : '--',
                            },
                          ],
                          fontSize: 10,
                        },
                      ],
                      alignment: 'center',
                      border: [true, true, true, true],
                    },
                  ]
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

      //-- production, agency, client, and other entities.
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
                    text: params.sheetData?.production_entity?.name ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    bold: true,
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.production_entity?.address ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.production_entity?.phone ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- agency entity.
              {
                stack: [
                  {
                    text: params.sheetData?.agency_entity?.name ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    bold: true,
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.agency_entity?.address ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.agency_entity?.phone ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- client entity.
              {
                stack: [
                  {
                    text: params.sheetData?.client_entity?.name ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    bold: true,
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.client_entity?.address ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                  {
                    text: params.sheetData?.client_entity?.phone ?? '--',
                    style: 'tableCell',
                    alignment: 'left',
                    margin: [0, 0, 0, 3],
                  },
                ],
                border: [true, true, true, true],
              },

              //-- other entities.
              ...(params.sheetData?.other_entities?.length > 0
                ? params.sheetData?.other_entities.map((ent: any) => ({
                    stack: [
                      {
                        text: ent?.name ?? '--',
                        style: 'tableCell',
                        alignment: 'left',
                        bold: true,
                        margin: [0, 0, 0, 3],
                      },
                      {
                        text: ent?.address ?? '--',
                        style: 'tableCell',
                        alignment: 'left',
                        margin: [0, 0, 0, 3],
                      },
                      {
                        text: ent?.phone ?? '--',
                        style: 'tableCell',
                        alignment: 'left',
                        margin: [0, 0, 0, 3],
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
      ...(params.sheetData?.reminder
        ? [
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      text: `REMINDER: ${params.sheetData?.reminder.toUpperCase()}`,
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
      ...(params.sheetData?.other_locations?.length > 0
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
    // margin: [0, 10, 0, 0],
    defaultStyle: {
      font: 'Roboto',
    },
  };
};
