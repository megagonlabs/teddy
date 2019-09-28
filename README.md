# Teddy, the Review Explorer

This page contains the source code and supplementary material for our CHI 2019 submission "Teddy: A System for Interactive Review Analysis" (Submission ID 2234).

1. [Introduction](#Introduction)
   - [Online Demo](#Demo)
2. [Motivation: a Review Analysis Interview Study](#InterviewStudy)
3. [How to use the data and source code in this repo?](#Use)
   - [Installation](#Installation)
   - [API Keys](#Keys)
   - [Running the Application](#Run)
4. [The Dataset](#Dataset)

<a name='Introduction'></a><h3> Introduction </h3> 

Teddy (Text Exploration for Diving into Data deeplY) is an interactive system that enables data scientists to quickly obtain insights from reviews and improve their extraction and modeling pipelines. __You can try our <a name='Demo'></a>[online demo here!](http://ec2-54-67-71-12.us-west-1.compute.amazonaws.com:3000/)__

Please watch our [demo video](https://drive.google.com/open?id=1bAu0FXF6t6I2ESuEFcvcYX-M6WJWi3so) for a detailed description of the features.

<img src="results/Teddy_CHI.gif" width="900"/>

<a name='InterviewStudy'></a><h3> Motivation: a Review Analysis Interview Study </h3> 

To better understand data science practices and challenges in review analysis and mining, we conducted an interview study with data scientists working with review text corpora. We interviewed 14 researchers (11 male and 3 female) and asked about their task goals, process, and especially their bottlenecks. Once interviews were completed, we used an iterative coding method to analyze the notes. __See the results of our iterative coding [here](https://github.com/teddyauthors/teddy/results/interview_study_iterative_coding.xlsx).__

<a name='Use'></a><h3> How to use the data and source code in this repo? </h3>

Important Folders
* `app/` server and front-end code
* `data/` subdirectories containing Trip Advisor data or your own datasets
* `libs/` python libraries for data processing
* `tests/` testing code for the code in `libs/`

<a name='Installation'></a><h3> Installation </h3> 
* Teddy requires Python 3.5 or above
* Make sure you have `venv` installed. If you don't, run: `python3 -m pip install virtualenv`
* Install dependencies\
`make install`
* Build dependencies\
`make build`\
(These will automatically run in a virtual environment called `venv`)

<a name='Keys'></a><h3> API Keys (Optional) </h3> 
Teddy requires Google API Keys in order to render the map and the hotel images. Please refer to [Google Maps Platform](https://developers.google.com/maps/documentation/embed/get-api-key) on how to get an API Key. Makefile will ask for this key during installation, however you can also configure this later on by calling `make keys`.

<a name='Run'></a><h3> Running the Application </h3> 
```bash
# start the backend server
make server
# start the user interface
make ui
```
Then navigate to [http://localhost:3000](http://localhost:3000) in your browser.

<a name='Dataset'></a><h3> The Dataset </h3>
The [reviews we provide](https://github.com/teddyauthors/teddy/data/tripadvisor_hotels.zip) in order to demonstrate the application are provided by Trip Advisor under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/legalcode)

(Barkha Bansal. (2018). TripAdvisor Hotel Review Dataset. Zenodo. [http://doi.org/10.5281/zenodo.1219899](http://doi.org/10.5281/zenodo.1219899)). 

A subset of the reviews for San Francisco hotels have been selected and modified by (1) computing extractions of aspect, opinion pairs and (2) clustering and computing statistics over those clusters.

Some of the icons used in our application are made by [Freepik](https://www.flaticon.com/authors/freepik) and can be found at [www.flaticon.com](https://www.flaticon.com).
