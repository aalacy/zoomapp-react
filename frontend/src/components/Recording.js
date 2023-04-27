import React, { useEffect, useState, useCallback } from "react";
import Button from "react-bootstrap/Button";
import Spinner from 'react-bootstrap/Spinner';

import { RECORDING_STATUS } from "../util";

export const Recording = (props) => {
    const { connected, runningContext, meetingContext, recordingContext, getRecordingContext } = props

    const [meeting, setMeeting] = useState()
    const [joinToken, setJoinToken] = useState()
    const [signature, setSignature] = useState()
    const [text, setText] = useState([])
    const [btnLabel, setBtnLabel] = useState("Record")

    useEffect(() => {
        if (runningContext !== "inMeeting") return;
        if (!connected) return;
        if (!meetingContext) return;

        setText([])
    }, [runningContext, connected, meetingContext])

    useEffect(() => {
      if (!recordingContext) return;

      switch(recordingContext.status) {
        case "started":
          setBtnLabel("Recording")
          break
        case "paused":
          setBtnLabel("Resume Recording")
          break
        case "stopped":
          setBtnLabel("Record")
          getResponseAfterRecording()
          break
      }
    }, [recordingContext?.status])

    async function fetchLocalRecordingJoinToken() {
        console.log('fetchLocalRecordingJoinToken =====')
        try {
          // An example of using the Zoom REST API via proxy
          const response = await fetch(`/zoom/api/v2/meetings/${meetingContext.meetingID}/jointoken/local_recording`);
          if (response.status !== 200) throw new Error();
          const _jointoken = await response.json();
          console.log('_jointoken', _jointoken)
          setJoinToken(_jointoken)
          return _jointoken
        } catch (error) {
          console.error(error);
          console.log(
            "Request to Zoom REST API has failed ^, fetchLocalRecordingJoinToken"
          );
          // setError("There was an error getting your user information");
        }
    }

    const getMeetingInfo = async () => {
        console.log('getMeetingInfo =====')
        try {
          // An example of using the Zoom REST API via proxy
          const response = await fetch(`/zoom/api/v2/meetings/${meetingContext.meetingID}`);
          if (response.status !== 200) throw new Error();
          const meetingInfo = await response.json();
          console.log('jointoken', meetingInfo)
          setMeeting({...meetingInfo})
          return meetingInfo
        } catch (error) {
          console.error(error);
          console.log(
            "Request to Zoom REST API has failed ^, getMeetingInfo"
          );
          // setError("There was an error getting your user information");
        }
    }

    const joinMeeting = async (meeting, jointoken) => {
        try {
            const signatureResponse = await (await fetch("/api/zoomapp/generate-signature", {
              method: 'POST',
              headers: {
                Accept: 'application.json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                meetingNumber: meeting.meetingID,
                role: 1
              }),
              cache: 'default'
            })).json();
            console.log(signatureResponse);
            if (!signatureResponse || !signatureResponse.signature) {
              console.error(
                "Error in generating signature - likely an outdated user session.  Please refresh the app"
              );
              return;
            }
            setSignature(signatureResponse.signature)

            meeting.token = jointoken.token
          } catch (e) {
            console.error(e);
          }
    }

    const getResponseAfterRecording = async () => {
      const res = await fetch("/api/zoomapp/recording")
      const data = await res.json()
      setText([
        ...text,
        data.message
      ])
    }

    const controlCloudRecording = () => {
      console.log("startCloudRecording ", recordingContext?.status);
      let action = "start";
      if (recordingContext.status === RECORDING_STATUS.PAUSED) {
        action = "resume";
      } else if (recordingContext.status === RECORDING_STATUS.STOPPED) {
        action = "start";
      } else if (recordingContext.status === RECORDING_STATUS.STARTED) {
        action = "stop";
      } else if (recordingContext.status === RECORDING_STATUS.CONNECTING) {
        return;
      }
      zoomSdk
        .cloudRecording({ action })
        .then((ctx) => {
          console.log(ctx);
          getRecordingContext(action)
        })
        .catch((e) => {
          console.log(e);
        });
    };

    const renderBannerText = (text) => {
      return (
        <ul className="banner-text">
        {
          text.map(t => (
        
            <li>{t}</li>
        ))
        }
        </ul>
      )
    }

    return (
        <>
        <div className="top-banner">{text.length === 0 ? "Placeholder AI Text" : renderBannerText(text)}</div>

        { recordingContext?.status === RECORDING_STATUS.STARTED && <Spinner className="loading" animation="grow" /> }

        { meetingContext && <Button
            variant="primary"
            onClick={controlCloudRecording}
        >
            {btnLabel}
        </Button> }
        </>
    )
}