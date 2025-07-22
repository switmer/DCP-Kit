import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
  Font,
} from "@react-email/components";

interface CallCardProps {
  memberName: string;
  jobName: string;
  callTime: string;
  fullDate: string;
  confirmationUrl: string;
}

/* <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,700&display=swap" rel="stylesheet"> */

export const CallCard = ({
  memberName,
  jobName,
  callTime,
  fullDate,
  confirmationUrl,
}: CallCardProps) => (
  <Html>
    <Head>
      <Font
        fontFamily="DM Sans"
        fallbackFontFamily="Verdana"
        webFont={{
          url: "https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZ2IHTWEBlwu8Q.woff2",
          format: "woff2",
        }}
        fontWeight={"100 1000"}
        fontStyle="normal"
      />
      <Font
        fontFamily="DM Sans"
        fallbackFontFamily="Verdana"
        webFont={{
          url: "https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2",
          format: "woff2",
        }}
        fontWeight={"100 1000"}
        fontStyle="normal"
      />
    </Head>
    <Preview>Your call time for {jobName}</Preview>
    <Tailwind>
      <Body className="bg-white my-auto mx-auto font-sans px-2">
        <Container className="border border-solid border-neutral-200 rounded-xl my-[40px] mx-auto p-[20px] max-w-[465px]">
          <Section className="mt-[32px]">
            <Img
              src={`${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`}
              width="150"
              height="41"
              alt="Roster"
              className="my-0 mx-auto bg-transparent"
            />
          </Section>
          <Heading className="text-[#121212] text-[24px] font-normal text-center p-0 my-[30px] mx-0">
            Hey {memberName},
          </Heading>
          <Heading className="text-[#121212] text-[24px] font-normal text-center p-0 my-[30px] mx-0">
            Your call time for <strong>{jobName}</strong> is
            <br />
            <strong>{callTime}</strong> on {fullDate}.
          </Heading>
          <Section className="text-center mt-[32px] mb-[32px]">
            <Button
              className="bg-lime-300 rounded-xl text-[#121212] text-base font-semibold no-underline text-center px-5 py-3"
              href={confirmationUrl}
            >
              View details and confirm
            </Button>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

CallCard.PreviewProps = {
  memberName: "John Doe",
  jobName: "Enigma",
  callTime: "10:00 AM",
  fullDate: "November 14, 2024",
  confirmationUrl: "https://vercel.com/teams/invite/foo",
} as CallCardProps;

export default CallCard;
