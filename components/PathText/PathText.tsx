import { Fragment } from "react";

type PathTextProps = {
  text: string;
};

/**
 * Shows text that has a path in it, and lets a long path wrap after each
 * slash. The text itself does not change.
 */
export function PathText({ text }: PathTextProps) {
  const parts = text.split("/");

  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </Fragment>
  ));
}
