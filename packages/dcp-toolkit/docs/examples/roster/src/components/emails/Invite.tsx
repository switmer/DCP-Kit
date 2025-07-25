import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Img,
  Tailwind,
  Font,
} from "@react-email/components";

interface InviteProps {
  company?: string | null;
  url: string;
}

export const Invite = ({ company, url }: InviteProps) => (
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
    <Preview>You have been invited to Roster</Preview>
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
          <Heading className="text-[#12121] text-[24px] font-normal text-center p-0 my-[30px] mx-0">
            You have been invited to join
            <br />
            {!!company && ` ${company} on `} Roster.
          </Heading>
          <Section className="text-center mt-[32px] mb-[32px]">
            <Button
              className="bg-lime-300 rounded-xl text-[#121212] text-base font-semibold no-underline text-center px-5 py-3"
              href={url}
            >
              Accept the invite
            </Button>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

Invite.PreviewProps = {
  company: "Enigma",
  url: "https://onroster.app/invite/foo",
} as InviteProps;

export default Invite;
