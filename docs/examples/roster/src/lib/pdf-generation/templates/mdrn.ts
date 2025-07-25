import { convertUnixTimeToAmPm } from '@/lib/weather/convertUnixTimeToAmPm';
import { classicStyle } from '@/lib/pdf-generation/styles/classicStyle';
import { TemplateParams } from '@/lib/pdf-generation/types';
import { formatDate } from 'date-fns/format';

export const mdrn = (params: TemplateParams, crewTableContent: any) => {
  //-- find the index where entity tables start.
  //-- look for tables with headers CLIENT/AGENCY/VENDOR (excluding PRODUCTION COMPANY).
  let entityStartIndex = crewTableContent.findIndex((table: any) => {
    if (
      table.table &&
      table.table.body &&
      table.table.body[0] &&
      table.table.body[0][0] &&
      table.table.body[0][0].text
    ) {
      const headerText = table.table.body[0][0].text;
      return headerText === 'CLIENT' || headerText === 'AGENCY' || headerText === 'VENDOR';
    }

    return false;
  });

  //-- if no entity tables found, use the default middle calculation.
  const middle = entityStartIndex > 0 ? entityStartIndex : Math.ceil(crewTableContent?.length / 2);

  //-- calculate width for first row of cells.
  const advdFirstRowWidth = ['*', '*', '*'];

  //-- add a column when weather or a parking location exists.
  // params.sheetData?.schedule?.meal_times?.breakfast && advdFirstRowWidth.push('*');
  (params.sheetData?.weather?.low || params.sheetData?.weather?.high) && advdFirstRowWidth.push('*');
  (params.sheetData?.parking_location?.address || params.sheetData?.truck_parking_location?.address) &&
    advdFirstRowWidth.push('*');

  //-- calculate width for second row of cells.
  const advdSecondRowWidth = ['*', '*'];

  //-- add a column when truck parking exists.
  (params.sheetData?.truck_parking_location?.name || params.sheetData?.truck_parking_location?.address) &&
    advdSecondRowWidth.push('*');

  const splitDayOfDays = params.sheetData.day_of_days.split(' ');

  const day = splitDayOfDays[1];
  const ofDays = splitDayOfDays[3];

  const paddedCellsBlackBorderTableLayoutDefinition = {
    hLineWidth: function () {
      return 0.5;
    },
    vLineWidth: function () {
      return 0.5;
    },
    hLineColor: function () {
      return '#000';
    },
    vLineColor: function () {
      return '#000';
    },
    //-- NOTE -- custom padding options.
    //-- "i" is the column index:
    //-- 0: production contact cell.
    //-- 1: crew call cell.
    //-- 2: nearest hospital cell.
    paddingLeft: function (i: number, node: any) {
      if (i === 0) return 10;
      if (i === 1) return 10;
      if (i === 2) return 10;
      if (i >= 3) return 10;

      return 5; //-- default.
    },
    paddingRight: function (i: number, node: any) {
      if (i === 0) return 10;
      if (i === 1) return 10;
      if (i === 2) return 10;

      return 5; //-- default.
    },
    paddingTop: function (i: number, node: any) {
      if (i === 0) {
        //-- you can access column index through node.
        const cols = node.table.widths.length;
        const col = i % cols;

        if (col === 0) return 10;
        if (col === 1) return 10;
        if (col === 2) return 10;
      }

      return 5; //-- default.
    },
    paddingBottom: function (i: number, node: any) {
      if (i === 0) {
        const cols = node.table.widths.length;
        const col = i % cols;

        if (col === 0) return 10;
        if (col === 1) return 10;
        if (col === 2) return 10;
      }

      return 5; //-- default.
    },
  };

  const sectionHeader = (headerText: string) => {
    return {
      text: headerText,
      style: 'sectionHeader',
      fillColor: '#000',
      color: '#fff',
      fontSize: 9,
    };
  };

  const cellHeader = (headerText: string) => {
    return {
      text: headerText,
      fontSize: 7,
      bold: true,
      color: '#555',
      margin: [0, 0, 0, 5],
    };
  };

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
    // pageSize: 'TABLOID',
    pageSize: {
      //-- width and height are in points; 72p -> 1 inch.
      width: 936,
      height: 1224,
    },
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
    content: [
      //-- top black bar with project name, job number, and day of days.
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                columns: [
                  {
                    text: [`${params.sheetData?.project_name.toUpperCase()}`],
                    alignment: 'left',
                    fontSize: 14,
                    color: 'white',
                    bold: true,
                  },
                  {
                    text: [
                      {
                        text: [
                          {
                            text: params.sheetData?.full_date
                              ? formatDate(params.sheetData.full_date, 'MMMM dd, yyyy')
                              : '--',
                            color: 'white',
                            fontSize: 9,
                            bold: true,
                            // margin: [0, 5, 0, 0],
                          },
                          { text: '     ' }, //-- spacer.
                        ],
                      },
                      ...(params.sheetData?.job_number
                        ? [
                            {
                              text: [
                                {
                                  text: `JOB # `,
                                  color: '#bbb',
                                  fontSize: 9,
                                  // margin: [0, 5, 0, 0],
                                },
                                {
                                  text: `${params.sheetData?.job_number}`,
                                  color: 'white',
                                  fontSize: 9,
                                  bold: true,
                                },
                                { text: '     ' }, //-- spacer.
                              ],
                            },
                          ]
                        : []),
                      {
                        text: [
                          {
                            text: `DAY `,
                            color: '#bbb',
                            fontSize: 9,
                          },
                          {
                            text: `${day}`,
                            color: 'white',
                            fontSize: 9,
                            bold: true,
                          },
                          {
                            text: ` OF `,
                            color: '#bbb',
                            fontSize: 9,
                          },
                          {
                            text: `${ofDays}`,
                            color: 'white',
                            fontSize: 9,
                            bold: true,
                          },
                        ],
                      },
                    ],
                    alignment: 'right',
                  },
                ],
                fillColor: '#000',
                color: 'white',
                padding: [30, 20, 30, 20], //-- main cell padding for the black bar.
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
          paddingLeft: function () {
            return 15;
          },
          paddingRight: function () {
            return 15;
          },
          paddingTop: function () {
            return 8;
          },
          paddingBottom: function () {
            return 8;
          },
        },
        margin: [0, 0, 0, 0],
      },

      //-- crew call, weather, shoot/parking/hospital locations.
      {
        table: {
          widths: advdFirstRowWidth,
          body: [
            [
              //-- crew call and breakfast/lunch times.
              {
                stack: [
                  //-- header text.
                  {
                    text: 'CREW CALL',
                    fontSize: 7,
                    bold: true,
                    color: '#555',
                    margin: [0, 0, 0, 5],
                  },
                  //-- crew call.
                  {
                    text: params.sheetData?.general_crew_call ?? '--',
                    style: 'tableCell',
                    // alignment: 'center',
                    fontSize: 20,
                    color: 'black',
                    bold: true,
                    margin: [0, 0, 0, 5],
                  },

                  //-- breakfast.
                  ...(params.sheetData?.schedule?.meal_times?.breakfast
                    ? [
                        {
                          text: [
                            {
                              text: `BREAKFAST: `,
                              // bold: true,
                              fontSize: 8,
                            },
                            {
                              text:
                                params.sheetData?.schedule?.meal_times?.breakfast &&
                                params.sheetData.schedule.meal_times.breakfast,
                              bold: true,
                              fontSize: 9,
                            },
                          ],
                        },
                      ]
                    : []),

                  //-- lunch.
                  ...(params.sheetData?.schedule?.meal_times?.lunch
                    ? [
                        {
                          text: [
                            {
                              text: `LUNCH: `,
                              // bold: true,
                              fontSize: 8,
                            },
                            {
                              text: params.sheetData.schedule.meal_times.lunch,
                              bold: true,
                              fontSize: 9,
                            },
                          ],
                        },
                      ]
                    : []),
                ],
                border: [true, true, true, true],
              },

              //-- weather, only if it exists.
              ...(params.sheetData?.weather?.low || params.sheetData?.weather?.high
                ? [
                    {
                      stack: [
                        //-- header text.
                        {
                          text: 'WEATHER',
                          fontSize: 7,
                          bold: true,
                          color: '#555',
                          margin: [0, 0, 0, 5],
                        },

                        //-- high/low.
                        {
                          text: [
                            // { text: `High: `, bold: true },
                            {
                              text: `${Math.round(params.sheetData?.weather.high)}ºF`,
                            },
                            { text: ' | ' }, //-- separator.
                            // { text: `Low: `, bold: true },
                            {
                              text: `${Math.round(params.sheetData?.weather.low)}ºF`,
                            },
                            { text: ' • ' }, //-- separator.
                            {
                              text: params.sheetData?.weather?.condition?.main,
                            },
                          ],
                          fontSize: 9,
                          bold: true,
                          margin: [0, 1, 0, 2],
                        },

                        //-- sunrise/sunset.
                        {
                          text: [
                            {
                              text: `RISE: `,
                              // bold: true,
                              fontSize: 8,
                            },
                            {
                              text: params.sheetData?.weather?.sunrise
                                ? convertUnixTimeToAmPm(params.sheetData.weather.sunrise)
                                : '--',
                              bold: true,
                            },
                            { text: ' | ' }, //-- separator.
                            {
                              text: `SET: `,
                              // bold: true,
                              fontSize: 8,
                            },
                            {
                              text: params.sheetData?.weather?.sunset
                                ? convertUnixTimeToAmPm(params.sheetData?.weather.sunset)
                                : '--',
                              bold: true,
                            },
                          ],
                          fontSize: 9,
                        },
                      ],
                      border: [true, true, true, true],
                    },
                  ]
                : []),

              //-- shoot location.
              {
                stack: [
                  //-- header text.
                  {
                    text: 'SHOOT LOCATION',
                    fontSize: 7,
                    bold: true,
                    color: '#555',
                    margin: [0, 0, 0, 5],
                  },

                  //-- location info.
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
                ],
              },

              //-- crew and truck parking.
              ...(params.sheetData?.parking_location?.address || params.sheetData?.truck_parking_location?.address
                ? [
                    {
                      stack: [
                        //-- header text..
                        {
                          text: 'PARKING',
                          fontSize: 7,
                          bold: true,
                          color: '#555',
                          margin: [0, 0, 0, 5],
                        },

                        //-- location info.
                        {
                          stack: [
                            // {
                            //   text: params.sheetData?.parking_location?.name ?? '--',
                            //   style: 'tableCell',
                            //   alignment: 'left',
                            //   bold: true,
                            //   margin: [0, 0, 0, 3],
                            // },
                            {
                              text: 'CREW',
                              style: 'tableCell',
                              alignment: 'left',
                              bold: true,
                              fontSize: 8,
                              margin: [0, 0, 0, 3],
                            },
                            {
                              text: params.sheetData?.parking_location?.address ?? '--',
                              style: 'tableCell',
                              alignment: 'left',
                              fontSize: 7,
                              margin: [0, 0, 0, 3],
                            },
                            // {
                            //   text: params.sheetData?.parking_location?.phone ?? '--',
                            //   style: 'tableCell',
                            //   alignment: 'left',
                            //   margin: [0, 0, 0, 3],
                            // },
                          ],
                          border: [true, true, true, true],
                        },

                        //-- truck parking, only if it exists.
                        ...(params.sheetData?.truck_parking_location?.address
                          ? [
                              // {
                              //   text: 'TRUCK PARKING',
                              //   fontSize: 7,
                              //   bold: true,
                              //   color: '#555',
                              //   margin: [0, 0, 0, 5],
                              // },

                              //-- location info.
                              {
                                stack: [
                                  // {
                                  //   text: params.sheetData?.truck_parking_location?.name ?? '--',
                                  //   style: 'tableCell',
                                  //   alignment: 'left',
                                  //   bold: true,
                                  //   margin: [0, 0, 0, 3],
                                  // },
                                  {
                                    text: 'TRUCK',
                                    style: 'tableCell',
                                    alignment: 'left',
                                    bold: true,
                                    fontSize: 8,
                                    margin: [0, 0, 0, 3],
                                  },
                                  {
                                    text: params.sheetData?.truck_parking_location?.address,
                                    style: 'tableCell',
                                    alignment: 'left',
                                    fontSize: 7,
                                    margin: [0, 0, 0, 3],
                                  },
                                  // {
                                  //   text: params.sheetData?.truck_parking_location?.phone ?? '--',
                                  //   style: 'tableCell',
                                  //   alignment: 'left',
                                  //   margin: [0, 0, 0, 3],
                                  // },
                                ],
                                border: [true, true, true, true],
                              },
                            ]
                          : []),
                      ],
                    },
                  ]
                : []),

              //-- nearest hospital and safety hotline.
              {
                stack: [
                  //-- header text.
                  {
                    text: 'NEAREST HOSPITAL & SAFETY',
                    fontSize: 7,
                    bold: true,
                    color: '#555',
                    margin: [0, 0, 0, 5],
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
                            text: [
                              {
                                text: 'IATSE SAFETY: ',
                                fontSize: 8,
                                // bold: true,
                              },
                              {
                                text: '844-422-9273',
                                fontSize: 9,
                                bold: true,
                              },
                            ],
                            style: 'tableCell',
                            alignment: 'left',
                            // margin: [0, 5, 0, 3],
                          },
                        ],
                      },
                    ],
                    border: [true, true, true, true],
                  },
                ],
                border: [true, true, true, true],
              },
            ],
          ],
        },
        layout: paddedCellsBlackBorderTableLayoutDefinition,
        margin: [0, 0, 0, 0],
      },

      //-- production, agency, client, and production contacts.
      {
        //-- companies and production contacts header.
        table: {
          widths: params.sheetData?.production_contacts?.length > 0 ? ['75%', '25%'] : ['*'],
          body: [
            [
              sectionHeader('COMPANIES'),

              ...(params.sheetData?.production_contacts?.length > 0 ? [sectionHeader('PROD. CONTACTS')] : []),
            ],
          ],
        },
        layout: {
          paddingLeft: () => 5,
          paddingTop: () => 0,
          paddingRight: () => 5,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 0],
      },

      {
        table: {
          //-- dynamically adjust columns depending on number of entities.
          // widths: Array(
          //   3 + (params.sheetData?.other_entities?.length > 0 ? params.sheetData?.other_entities.length : 0),
          // ).fill('*'),
          widths: params.sheetData?.production_contacts?.length > 0 ? ['*', '*', '*', '*'] : ['*', '*', '*'],
          body: [
            [
              //-- production entity.
              {
                stack: [
                  //-- header text.
                  cellHeader('PRODUCTION'),

                  //-- information.
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
                ],
              },

              //-- agency entity.
              {
                stack: [
                  //-- header text.
                  cellHeader('AGENCY'),

                  //-- information.
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
                ],
              },

              //-- client entity.
              {
                stack: [
                  //-- header text.
                  cellHeader('CLIENT'),

                  //-- information.
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
                ],
              },

              //-- production contacts.
              ...(params.sheetData?.production_contacts?.length > 0
                ? [
                    {
                      stack: [
                        //-- contact information.
                        {
                          stack: params.sheetData.production_contacts.map((contact: any) => ({
                            text: [
                              {
                                text: `${contact.title.toUpperCase()}: `,
                                // bold: true,
                                fontSize: 6,
                              },
                              {
                                text: `${contact.name} - `,
                                fontSize: 8,
                              },
                              {
                                text: `${contact.phone}`,
                                fontSize: 7,
                                color: '#555',
                              },
                            ],
                            style: 'tableCell',
                            alignment: 'left',
                            margin: [5, 0, 5, 1],
                          })),
                        },
                      ],
                      layout: paddedCellsBlackBorderTableLayoutDefinition,
                    },
                  ]
                : []),
            ],
          ],
        },
        layout: paddedCellsBlackBorderTableLayoutDefinition,
        margin: [0, 0, 0, 0],
      },

      //-- featured notes.
      ...(params.sheetData?.featured_notes?.length
        ? [
            {
              table: {
                widths: ['*'],
                body: params.sheetData.featured_notes.map(
                  (note: { title: string; body: string; isHighlighted: boolean }) => [
                    {
                      text: `${note.title.toUpperCase()}: ${note.body.toUpperCase()}`,
                      style: 'tableCell',
                      alignment: 'center',
                      bold: true,
                      ...(note.isHighlighted ? { fillColor: '#FFFF00' } : {}),
                      padding: [5, 8, 5, 8],
                    },
                  ],
                ),
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

      //-- other locations.
      ...(params.sheetData?.other_locations?.length > 0
        ? [
            //-- header text.
            {
              table: {
                widths: ['*'],
                body: [[sectionHeader('OTHER LOCATIONS')]],
              },
              layout: {
                paddingLeft: () => 5,
                paddingTop: () => 0,
                paddingRight: () => 5,
                paddingBottom: () => 0,
              },
              margin: [0, 0, 0, 0],
            },

            {
              table: {
                widths: ['25%', '10%', '28%', '37%'],
                body: [
                  //-- table header row.
                  [
                    {
                      text: 'NAME',
                      style: 'tableHeader',
                      alignment: 'center',
                      bold: true,
                    },
                    {
                      text: 'TYPE',
                      style: 'tableHeader',
                      alignment: 'center',
                      bold: true,
                    },
                    {
                      text: 'ADDRESS',
                      style: 'tableHeader',
                      alignment: 'center',
                      bold: true,
                    },
                    {
                      text: 'NOTES',
                      style: 'tableHeader',
                      alignment: 'center',
                      bold: true,
                    },
                  ],

                  //-- information.
                  ...params.sheetData?.other_locations.map((location: any) => [
                    {
                      text: location?.name ?? '--',
                      style: 'tableCell',
                      alignment: 'left',
                      bold: true,
                    },
                    {
                      text: location?.type.toUpperCase() ?? '--',
                      style: 'tableCell',
                      alignment: 'left',
                      bold: true,
                    },
                    {
                      text: location?.address ?? '--',
                      style: 'tableCell',
                      alignment: 'left',
                    },
                    {
                      text: location?.instructions_or_notes ?? '--',
                      style: 'notesText',
                      alignment: 'left',
                    },
                  ]),
                ],
              },
              layout: {
                paddingLeft: () => 2,
                paddingRight: () => 2,
                paddingTop: () => 2,
                paddingBottom: () => 2,
              },
            },
          ]
        : []),

      //-- crew and notes tables.
      ...(params?.options?.USE_TWO_COLUMNS
        ? [
            //-- header text.
            {
              table: {
                widths: ['*'],
                body: [[sectionHeader('CREW')]],
              },
              layout: {
                paddingLeft: () => 5,
                paddingTop: () => 0,
                paddingRight: () => 5,
                paddingBottom: () => 0,
              },
              margin: [0, 0, 0, 0],
            },

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
