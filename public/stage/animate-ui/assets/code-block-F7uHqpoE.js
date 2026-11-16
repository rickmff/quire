import{t as e}from"./code-block-BFdCuTzm.js";import{t}from"./utils-D0T3A-kS.js";import{n,t as r}from"./index-BlOPuxzi.js";var i=r(),a=({duration:r,delay:a,writing:o,cursor:s})=>{let{resolvedTheme:c}=n();return(0,i.jsx)(`div`,{className:`relative bg-accent w-[420px] h-[372px] text-sm p-4 overflow-auto`,children:(0,i.jsx)(e,{code:`'use client';
 
import * as React from 'react';
 
type MyComponentProps = {
  myProps: string;
} & React.ComponentProps<'div'>;
 
function MyComponent(props: MyComponentProps) {
  return (
    <div {...props}>
      <p>My Component</p>
    </div>
  );
}

export { MyComponent, type MyComponentProps };`,lang:`tsx`,theme:c===`dark`?`dark`:`light`,writing:o,duration:r,delay:a,className:t(`[&>pre,_&_code]:!bg-transparent [&>pre,_&_code]:[background:transparent_!important] [&>pre,_&_code]:border-none [&_code]:!text-[13px] [&_code_.line]:!px-0`,s&&`data-[done=false]:[&_.line:last-of-type::after]:content-['|'] data-[done=false]:[&_.line:last-of-type::after]:inline-block data-[done=false]:[&_.line:last-of-type::after]:w-[1ch] data-[done=false]:[&_.line:last-of-type::after]:-translate-px`)})},`${r}-${a}-${o}-${s}`)};export{a as CodeBlockDemo};