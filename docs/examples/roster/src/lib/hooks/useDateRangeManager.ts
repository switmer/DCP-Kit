import { useState, useCallback, useEffect, useRef } from 'react';
import { addDays, subDays, parse, format, eachDayOfInterval } from 'date-fns';

const DATE_FORMAT = 'MM/dd/yy';
const PREP_DURATION = 14;
const POST_DURATION = 30;

const parseDate = (dateStr: string): Date => parse(dateStr, DATE_FORMAT, new Date());

const formatDate = (date: Date): string => format(date, DATE_FORMAT);

const generateDateRange = (start: Date, end: Date): string[] => eachDayOfInterval({ start, end }).map(formatDate);

const isValidDeliveryDate = (date: string, postDates: string[]): boolean => {
  if (postDates.length === 0) return false;

  const deliveryDateObj = parseDate(date);
  const firstPostDate = parseDate(postDates[0]);

  // Ensure delivery date is at least 1 day after the first post date
  return deliveryDateObj > firstPostDate;
};

const adjustPostDatesForDelivery = (
  postDates: string[],
  deliveryDate: string | undefined,
  lastShootDate?: Date,
): { postDates: string[]; deliveryDate: string | undefined } => {
  // if no delivery date, return the current state.
  if (!deliveryDate) {
    return { postDates, deliveryDate };
  }

  const deliveryDateObj = parseDate(deliveryDate);

  // if we have post dates, update them to end the day before delivery date.
  if (postDates.length > 0) {
    // get the first post date.
    const firstPostDate = parseDate(postDates[0]);

    // get the day before delivery date.
    const dayBeforeDelivery = subDays(deliveryDateObj, 1);

    // if the first post date is after or equal to the day before delivery (ensuring delivery date is at least 1 day after first post date),
    // or if delivery date is before or equal to last shoot date...
    if (firstPostDate >= dayBeforeDelivery || (lastShootDate && deliveryDateObj <= lastShootDate)) {
      if (lastShootDate) {
        // if delivery date overlaps with shoot dates, force it to be one day after last shoot date.
        if (deliveryDateObj <= lastShootDate) {
          const newDeliveryDate = formatDate(addDays(lastShootDate, 2));

          // return empty post dates since there's no valid range.
          return {
            postDates: [formatDate(firstPostDate)],
            deliveryDate: newDeliveryDate,
          };
        }

        // create post dates from day after last shoot to day before delivery.
        const dayAfterLastShoot = addDays(lastShootDate, 1);
        const newDayBeforeDelivery = subDays(deliveryDateObj, 1);

        // make sure there's at least one day between last shoot date and delivery date.
        if (newDayBeforeDelivery >= dayAfterLastShoot) {
          return {
            postDates: generateDateRange(dayAfterLastShoot, newDayBeforeDelivery),
            deliveryDate,
          };
        } else {
          // if there's no valid range, set delivery date to day after last shoot.
          return {
            postDates: [formatDate(firstPostDate)],
            deliveryDate: formatDate(addDays(lastShootDate, 2)),
          };
        }
      } else {
        // if no last shoot date but first post date is after or equal to day before delivery,
        // adjust delivery date to be day after first post date and update post dates accordingly.
        const newDeliveryDate = formatDate(addDays(firstPostDate, 1));
        const newDeliveryDateObj = parseDate(newDeliveryDate);
        const newDayBeforeDelivery = subDays(newDeliveryDateObj, 1);

        // Generate post dates from first post date to day before new delivery date
        // This ensures post dates don't extend beyond the new delivery date
        const updatedPostDates = postDates.filter((date) => parseDate(date) < newDeliveryDateObj);

        // If we have valid post dates after filtering, use them
        // Otherwise generate a range from first post date to day before new delivery date
        return {
          postDates: updatedPostDates.length > 0 ? updatedPostDates : [formatDate(firstPostDate)],
          deliveryDate: newDeliveryDate,
        };
      }
    }

    // Ensure post dates end before the delivery date
    const filteredPostDates = postDates.filter((date) => parseDate(date) <= deliveryDateObj);

    // If we have valid post dates, generate a range from first post date to day before delivery
    if (filteredPostDates.length > 0) {
      return {
        postDates: generateDateRange(firstPostDate, dayBeforeDelivery),
        deliveryDate,
      };
    } else {
      // If no valid post dates, return empty array
      return {
        postDates: [],
        deliveryDate,
      };
    }
  }

  // if no post dates but we have a last shoot date, auto-fill post dates.
  else if (lastShootDate) {
    const dayAfterLastShoot = addDays(lastShootDate, 1);
    const dayBeforeDelivery = subDays(deliveryDateObj, 1);

    // if delivery date is before or equal to last shoot date.
    if (deliveryDateObj <= lastShootDate) {
      // Set delivery date to be 2 days after last shoot date to ensure at least 1 day of post
      const newDeliveryDate = formatDate(addDays(lastShootDate, 2));
      // Add 1 day of post between last shoot date and delivery date
      return {
        postDates: [formatDate(addDays(lastShootDate, 1))],
        deliveryDate: newDeliveryDate,
      };
    }

    // make sure there's at least one day between last shoot date and delivery date.
    if (dayBeforeDelivery >= dayAfterLastShoot) {
      return {
        postDates: generateDateRange(dayAfterLastShoot, dayBeforeDelivery),
        deliveryDate,
      };
    } else {
      // If delivery date is immediately after last shoot date (no valid range),
      // adjust delivery date to be 2 days after last shoot date and add 1 day of post
      const newDeliveryDate = formatDate(addDays(lastShootDate, 2));
      return {
        postDates: [formatDate(addDays(lastShootDate, 1))],
        deliveryDate: newDeliveryDate,
      };
    }
  }

  // if no post dates and no last shoot date, return current state.
  return {
    postDates,
    deliveryDate,
  };
};

const generatePrepDates = (firstShootDate: Date): string[] => {
  const prepStart = subDays(firstShootDate, PREP_DURATION);
  const prepEnd = subDays(firstShootDate, 1);

  return generateDateRange(prepStart, prepEnd);
};

const generatePostDates = (lastShootDate: Date): string[] => {
  const postStart = addDays(lastShootDate, 1);
  const postEnd = addDays(lastShootDate, POST_DURATION);

  return generateDateRange(postStart, postEnd);
};

type DateRange = {
  from: Date;
  to: Date;
};

type ProjectDates = {
  prepDates?: string[];
  shootDates?: string[];
  postDates?: string[];
  deliveryDate?: string;
};

export const useDateRangeManager = (projectDates?: ProjectDates) => {
  const [prepDates, setPrepDates] = useState<string[]>([]);
  const [shootDates, setShootDates] = useState<string[]>([]);
  const [postDates, setPostDates] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>();

  const initialized = useRef(false);

  const handleSetShootDates = useCallback(
    (range: DateRange | null) => {
      if (range === null) {
        setShootDates([]);
        setPrepDates([]);
        return;
      }

      const newShootDates = generateDateRange(range.from, range.to)
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());

      if (newShootDates.length === 0) {
        setShootDates([]);
        return;
      }

      const firstShootDate = parseDate(newShootDates[0]);
      const lastShootDate = parseDate(newShootDates[newShootDates.length - 1]);

      // prep dates.
      if (prepDates.length === 0) {
        setPrepDates(generatePrepDates(firstShootDate));
      } else {
        setPrepDates((prevPrepDates) => prevPrepDates.filter((date) => parseDate(date) < firstShootDate));
      }

      // post dates.
      const minimumPostDate = formatDate(addDays(lastShootDate, 1));

      if (postDates.length > 0) {
        // adjust existing post dates.
        let adjustedPostDates = postDates.filter((date) => parseDate(date) > lastShootDate);

        // make sure there's at least one post date.
        if (adjustedPostDates.length === 0) {
          adjustedPostDates = [minimumPostDate];
        }

        if (deliveryDate) {
          const { postDates: finalPostDates, deliveryDate: adjustedDeliveryDate } = adjustPostDatesForDelivery(
            adjustedPostDates,
            deliveryDate,
            lastShootDate,
          );

          setPostDates(finalPostDates);
          setDeliveryDate(adjustedDeliveryDate);
        } else {
          setPostDates(adjustedPostDates);
        }
      }

      setShootDates(newShootDates);
    },
    [deliveryDate, prepDates.length, postDates.length],
  );

  const handleSetPrepDates = useCallback(
    (range: DateRange | null) => {
      if (range === null) {
        setPrepDates([]);
        return;
      }

      const newPrepDates = generateDateRange(range.from, range.to);

      if (shootDates.length > 0) {
        const firstShootDate = parseDate(shootDates[0]);
        setPrepDates(newPrepDates.filter((date) => parseDate(date) < firstShootDate));
        return;
      }

      setPrepDates(newPrepDates);
    },
    [shootDates],
  );

  const handleSetPostDates = useCallback(
    (range: DateRange | null) => {
      if (range === null) {
        setPostDates([]);
        return;
      }

      let newPostDates = generateDateRange(range.from, range.to);

      // shoot dates.
      if (shootDates.length > 0) {
        const lastShootDate = parseDate(shootDates[shootDates.length - 1]);
        const minimumPostDate = formatDate(addDays(lastShootDate, 1));

        // make sure at least one post date after shoot dates.
        newPostDates = newPostDates.filter((date) => parseDate(date) >= parseDate(minimumPostDate));

        if (newPostDates.length === 0) {
          newPostDates = [minimumPostDate];
        }
      }

      // adjust for delivery dates.
      if (deliveryDate) {
        const lastShootDate = shootDates.length > 0 ? parseDate(shootDates[shootDates.length - 1]) : undefined;

        const { postDates: adjustedPostDates, deliveryDate: adjustedDeliveryDate } = adjustPostDatesForDelivery(
          newPostDates,
          deliveryDate,
          lastShootDate,
        );

        setPostDates(adjustedPostDates);
        setDeliveryDate(adjustedDeliveryDate);
      } else {
        setPostDates(newPostDates);
      }
    },
    [shootDates, deliveryDate],
  );

  const handleSetDeliveryDate = useCallback(
    (date: string | null) => {
      if (!date) {
        setDeliveryDate(undefined);
        return;
      }

      // if (postDates.length === 0 && shootDates.length === 0) return;

      //-- get last shoot date if it exists.
      const lastShootDate = shootDates.length > 0 ? parseDate(shootDates[shootDates.length - 1]) : undefined;

      //-- use adjustPostDatesForDelivery for all cases to ensure consistent handling
      const { postDates: finalPostDates, deliveryDate: adjustedDeliveryDate } = adjustPostDatesForDelivery(
        postDates,
        date,
        lastShootDate,
      );

      //-- perform updates separately to ensure state changes are applied.
      setPostDates(finalPostDates);

      //-- pass an actual string value, not undefined.
      if (adjustedDeliveryDate) {
        setDeliveryDate(adjustedDeliveryDate);
      }
    },
    [postDates, shootDates],
  );

  useEffect(() => {
    if (!projectDates || initialized.current) return;

    let newShootDates: string[] = [];
    let newPrepDates: string[] = [];
    let newPostDates: string[] = [];
    let newDeliveryDate: string | undefined;

    if (projectDates.shootDates?.length) {
      newShootDates = [...projectDates.shootDates].sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());
    }

    if (projectDates.prepDates?.length) {
      newPrepDates = [...projectDates.prepDates].sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());

      //-- adjust prep dates if they overlap with shoot dates.
      if (newShootDates.length > 0) {
        const firstShootDate = parseDate(newShootDates[0]);
        newPrepDates = newPrepDates.filter((date) => parseDate(date) < firstShootDate);
      }
    }

    if (projectDates.postDates?.length) {
      newPostDates = [...projectDates.postDates].sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());

      //-- adjust post dates if they overlap with shoot dates.
      if (newShootDates.length > 0) {
        const lastShootDate = parseDate(newShootDates[newShootDates.length - 1]);

        newPostDates = newPostDates.filter((date) => parseDate(date) > lastShootDate);
      }
    }

    //-- handle delivery date initialization with proper checks.
    if (projectDates.deliveryDate) {
      const lastShootDate = newShootDates.length > 0 ? parseDate(newShootDates[newShootDates.length - 1]) : undefined;

      //-- always use adjustPostDatesForDelivery to ensure consistent rules.
      const { postDates: adjustedPostDates, deliveryDate: adjustedDeliveryDate } = adjustPostDatesForDelivery(
        newPostDates,
        projectDates.deliveryDate,
        lastShootDate,
      );

      newPostDates = adjustedPostDates;
      newDeliveryDate = adjustedDeliveryDate;
    }

    //-- set all states at once.
    setShootDates(newShootDates);
    setPrepDates(newPrepDates);
    setPostDates(newPostDates);
    setDeliveryDate(newDeliveryDate);

    initialized.current = true;
  }, [projectDates]);

  return {
    prepDates,
    shootDates,
    postDates,
    deliveryDate,
    setShootDates: handleSetShootDates,
    setPrepDates: handleSetPrepDates,
    setPostDates: handleSetPostDates,
    setDeliveryDate: handleSetDeliveryDate,
  };
};
