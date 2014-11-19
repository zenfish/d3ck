
This started as a one-off, but seems like an appropriate model for most,
if not all, d3ck interaction.


The mental model goes something like:

    - I want to do some action that involves your d3ck - file transfer,
      voice call, geo-displacement, etc.

    - I ask my d3ck to make it happen

    - my d3ck talks to your d3ck

    - your d3ck looks to see if you're authorized and authenticated
    
    - if necessary, your d3ck asks you for guidance (yes/no/etc)

    - things happen under the hood

    - actions done

At any time until it is done each side should be able to kill the action,
whether in progress or currently in session.


*** The big problem - as I see it - is state. Who keeps it?  This is
aggravated by flakiness of connections, latency, browser crashes,
browser differences, stupid user behavior, bugs, etc.


SOME types of interactivity don't need user or browser interaction. For
instance if I want to drag-n-drop a file to you, why can't I if you're
not around, if you've previously agreed to this?

Some demand interactivity, even if there's no explicity OK - for instance
video - if my browser isn't logged into a d3ck it doesn't matter if you
have the OK, I can't turn on my camera without the browser (even if I
could, you probably shouldn't :))


STATE of the Union
-------------------

So - state.  My current thought is that the server should be the
definitive holder of ALL state.  The browser or other d3cks can query it,
but it's the true one and only authority.  Obviously the browser has to
keep it as well, but the server is always right.

Back in the day I'd embraced web sockets, now I spit on them. I wanted
an event driven model, but I simply couldn't get two web sockets on two
different ports or channels working over https (not to mention the unholy
unwrapping and re-wrapping done by nginx and the server.)

So instead of doing the right thing, I essentially implemented work arounds
until I beat the infrastructure and browsers into submission.

CURRENTLY there is a queue on the server that is queried via the
browser/ajax every second or two. It is consumed/drained upon read
(don't use two browsers windows at once...... not even sure how that'd
be dealt with.)

This is used for user interactivity and informational notes ('markus
wants to connect', 'markus has sent you horsefucker.flv', etc.)

CURRENTLY there is a second set of data that is destined for the junk pile -
these are the status data structures which were designed for event-driven
actions. My thought was to keep them around so if you redraw your browser
you might be able to ask the server for the current status, but I think it'd
be much simpler/easier to simply keep the (above) queue around and mark 
whether or not things have been read/consumed... then if you redraw/crash you
have a better way of trying to dig the user out of the whole they're in.


But... this is the problem at hand. There's a sequence, that mental
model above... and it should be resilient and do the right thing.



Issues to consider, or Things that Fuck With State
---------------------------------------------------

Loss of packets... network outage or whatever.

Out of order stuff.

Duplicates; what if I hit the Call Button twice before anything gets to
you or your d3ck or you've had a chance to answer?

What if your browser crashed after you've said yes and it's an interactive
call? Should there be a heartbeat or something?

What if you log out of your d3ck, say, in the middle of a call, or
file transfer, or...?

What if you as a user just close up your laptop and leave your d3ck
running. What can it do by itself?

Long latency - what about many second latency - we probably had that
last night...?

Stupid users. Why on earth would you... press that button... log out...
press that button again... drag that terabyte file to your browser... etc.

